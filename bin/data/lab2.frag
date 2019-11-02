#version 450

uniform vec2 iResolution;
uniform float iTime;

uniform float camFov; 

uniform vec3 eyePosition;
uniform vec3 lookAtDir;
uniform mat4 view;

uniform vec3 bgColor;
out vec4 Out_Frag;

float fBoolOps(vec3 p, int showcase_opIndex) {
	float box = fBox(p,vec3(1));
	float sphere = length(p-vec3(1))-1;
	float d;
	float r = 0.3;
	float n = 4;
	
	switch (int(showcase_opIndex)) {
		case 0: d = min(box,sphere); break;
		case 1: d = max(box,sphere); break;
		case 2: d = max(box,-sphere); break;
		
		case 3: d = fOpUnionRound(box,sphere,r); break;
		case 4: d = fOpIntersectionRound(box,sphere,r); break;
		case 5: d = fOpDifferenceRound(box,sphere,r); break;
		
		case 6: d = fOpUnionChamfer(box,sphere,r); break;
		case 7: d = fOpIntersectionChamfer(box,sphere,r); break;
		case 8: d = fOpDifferenceChamfer(box,sphere,r); break;
		
		case 9 : d = fOpUnionColumns(box,sphere,r,n); break;
		case 10: d = fOpIntersectionColumns(box,sphere,r,n); break;
		case 11: d = fOpDifferenceColumns(box,sphere,r,n); break;
		
		case 12: d = fOpUnionStairs(box,sphere,r,n); break;
		case 13: d = fOpIntersectionStairs(box,sphere,r,n); break;
		case 14: d = fOpDifferenceStairs(box,sphere,r,n); break;
		
		case 15: d = fOpPipe(box,sphere,r*0.3); break;
		case 16: d = fOpEngrave(box,sphere,r*0.3); break;
		case 17: d = fOpGroove(box,sphere,r*0.3, r*0.3); break;
		case 18: d = fOpTongue(box,sphere,r*0.3, r*0.3); break;
		// The implementation of the next one is left as an exercise to the reader:
		// case 19: d = fOpFuckingBaroquePictureFrame(box,sphere,r); break;
	}
	
	return d;
}

float fDomainOps(vec3 p, int showcase_opIndex) {
	float size = 5;
	float c = 0;
	switch (int(showcase_opIndex)) {
		case 0: break; // scene without any domain manipulation
		case 1: c = pMod1(p.x,size); break;
		case 2: c = pModSingle1(p.x,size); break;
		case 3: c = pModInterval1(p.x,size,1,3); break;
		case 4: c = pModPolar(p.xz,7); p -= vec3(10,0,0); break;
		case 5: pMod2(p.xz,vec2(size)); break;
		case 6: pModMirror2(p.xz,vec2(size)); break;
		case 7: pMod3(p,vec3(size)); break;
	}
	
	// you could use the cell index for something:
	// p.y -= c*0.3;
	
	// the repeated geometry:
	float box = fBox(p, vec3(1));
	float sphere = length(p - vec3(1)) - 1;
	float d = min(box,sphere);
	
	// guard object to prevent discontinuities between cells
	// (which could lead to stepping into neighbouring cells).
	// doing this specific to the domain operator normally makes
	// more sense than this all-purpose guard.
	//negative box: 
	float guard = -fBoxCheap(p, vec3(size*0.5));
	// only positive values, but gets small near the box surface:
	guard = abs(guard) + size*0.1;

	return min(d,guard);
}

float sdf_blend(float d1, float d2, float a)
{
    return a * d1 + (1 - a) * d2;
}

float sdf_smin(float a, float b, float k = 32)
{
    float res = exp(-k*a) + exp(-k*b);
    return -log(max(0.0001,res)) / k;
}

float sdSphere(vec3 pos, float s)
{
    return length(pos) - s;
}

float sdBox( vec3 p,vec3 b)
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdRoundBox( vec3 p, vec3 b, float r)
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}


float sdCone(vec3 p, vec2 c )
{
    // c is the sin/cos of the angle
    float q = length(p.xy);
    return dot(c,vec2(q,p.z));
}

float sdBoy(vec3 pos)
{
    float t = fract(iTime);
    float y = 4.0 * t * (1.0 - t);
    vec3 cen = vec3(0, y, 0.0);
    // return sdSphere(pos - cen, 0.25);

    float d1 = sdSphere(pos - cen, 0.35);
    float d2 = sdSphere(pos - vec3(0, cen.y + 0.5, 0), 0.25);

    return sdf_smin(d1, d2, 20);
    return min(d1, d2);

}


float map(vec3 pos)
{
    // float t = fract(iTime);
    // float y = 4.0 * t * (1.0 - t);

    // float d1 = sdBox(pos - vec3(0,0,0), vec3(0.25));
    // float d2 = sdSphere(pos - vec3(0,0,0), 0.25);
    // float d = sdf_blend(d1, d2, y);

    //float d = sdBoy(pos);
    
    //float d = fBoolOps(pos, 15);
    float d = fDomainOps(pos, 7);
    
    // add floor
    float floor_d = pos.y - (-0.25);
    return min(d, floor_d);
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(vec3(map(pos + e.xyy) - map(pos - e.xyy),
                          map(pos + e.yxy) - map(pos - e.yxy),
                          map(pos + e.yyx) - map(pos - e.yyx)));
}

#define MAX_MARCHING_STEPS 100
#define EPSILON 0.0001
float rayCast(vec3 eye, vec3 raydir, float start = 0.0, float end = 20.0)
{
    float t = start;

    for(int i = 0; i < MAX_MARCHING_STEPS; ++i)
    {
        vec3 pos = eye + t * raydir;
        float h = map(pos);

        if(h < EPSILON) break;

        t += h;

        if(t > end) break;
    }

    if(t > end) t = -1.0;

    return t;
}

vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    //vec2 xy = (2.0 * fragCoord.xy -size.xy)  / size.y;
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

void main()
{
    //vec2 p = (2.0 * gl_FragCoord.xy -iResolution.xy)  / iResolution.y;

    //vec3 color = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
    //float f = smoothstep(0.2, 0.3, length(p));

    vec3 ro = eyePosition;
    //vec3 rd = normalize( mat3(inverse(view)) * vec3(p, -1.5));
    vec3 rd = normalize( mat3(inverse(view)) * rayDirection(camFov, iResolution.xy, gl_FragCoord.xy));

    // bgcolor
    vec3 color = vec3(0.4, 0.75, 1.0) - 0.7 * rd.y;    

    float t = rayCast(ro, rd);

    if(t >= 0.0)
    {
        vec3 pos = ro + t*rd;
        vec3 nor = calcNormal(pos);

        vec3 mate = vec3(0.2);

        vec3 sun_dir = normalize(vec3(0.6, 0.9, -0.2));
        float sun_dif = clamp(dot(nor, sun_dir), 0.0, 1.0);
        float sun_sha = step(rayCast(pos + nor * 0.001, sun_dir), 0.0);
        float sky_diff = clamp(0.5 + 0.5 * dot(nor, vec3(0.0, 1.0, 0.0)) , 0.0, 1.0);
        float bou_diff = clamp(0.5 + 0.5 * dot(nor, vec3(0.0, -1.0, 0.0)) , 0.0, 1.0);

        color = mate * vec3(7.0, 5.0, 3.0) * sun_dif * sun_sha;
        color += mate * vec3(0.5, 0.8, 0.9) * sky_diff;
        color += mate * vec3(0.7, 0.3, 0.2) * bou_diff;
    }

    color = pow(color, vec3(0.4545));

    Out_Frag = vec4(color, 1.0);
}