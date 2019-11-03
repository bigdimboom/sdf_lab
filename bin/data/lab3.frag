#version 450

uniform vec2 iResolution;
uniform float iTime;

uniform float camFov; 

uniform vec3 eyePosition;
uniform vec3 lookAtDir;
uniform mat4 view;

uniform vec3 bgColor;
out vec4 Out_Frag;

float sdf_blend(float d1, float d2, float a)
{
    return a * d1 + (1 - a) * d2;
}

float sdf_smin(float a, float b, float k = 32)
{
    float res = exp(-k*a) + exp(-k*b);
    return -log(max(0.0001,res)) / k;
}

float smin( float a, float b, float k = 0.1)
{
    float h = max( k-abs(a-b), 0.0 )/k;
    return min( a, b ) - h*h*k*(1.0/4.0);
}

float smax( float a, float b, float k = 0.1)
{
    float h = max( k-abs(a-b), 0.0 )/k;
    return max( a, b ) + h*h*k*(1.0/4.0);
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

float sdStick(vec3 p, vec3 a, vec3 b, float ra, float rb)
{
    vec3 ba = b - a;
    vec3 pa = p - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);

    float r = mix(ra, rb, h);

    return length(pa - h * ba) - r;
}

float sdEllipsoid(vec3 pos, vec3 rad)
{
    float k0 = length(pos / rad);
    float k1 = length(pos/rad/rad);
    return k0 * (k0 - 1.0) / k1;
}

vec2 sdBoy(vec3 pos)
{
    float t = fract(iTime);
    float y = 4.0 * t * (1.0 - t);
    float dy = 4.0 * (1.0 - 2.0 * t);
    
    // perpendicular uv
    vec2 u = normalize(vec2(1.0, -dy));
    vec2 v = vec2(dy, 1.0);

    vec3 cen = vec3(0.0, y, 0.0);

    float sy = 0.5 + 0.5 * y;
    float sz = 1.0 / sy;
    vec3 rad = vec3(0.25, 0.25 * sy, 0.25 * sz);
    
    // stretch
    // body
    vec3 q = pos - cen;
    //q.yz = vec2(dot(u,q.yz), dot(v,q.yz));
    float d1 = sdEllipsoid(q, rad);

    // head
    vec3 h = q;
    float d2 = sdEllipsoid(h - vec3(0, 0.28, 0), vec3(0.2));
    float d3 = sdEllipsoid(h - vec3(0, 0.28, -0.1), vec3(0.2));
    
    d2 = smin(d2, d3, 0.03);
    d1 = smin(d1, d2, 0.1);

    
    // eyebows
    vec3 sh = vec3(abs(h.x), h.yz); // make two symetricals
    vec3 eb = sh - vec3(0.12, 0.34, 0.15);
    eb.xy = (mat2(3,4,-4,3) / 5.0) * eb.xy;

    d2 = sdEllipsoid(eb, vec3(0.06, 0.035, 0.05));
    d1 = smin(d1, d2, 0.04);

    // mouth subtract
    //d2 = sdEllipsoid(h - vec3(0.0, 0.15, 0.15), vec3(0.1, 0.035, 0.2));
    d2 = sdEllipsoid(h - vec3(0.0, 0.15 + 3.0 * h.x * h.x, 0.15), vec3(0.1, 0.035, 0.2));
    d1 = smax(d1, -d2, 0.03);

    // ears
    d2 = sdStick(sh, vec3(0.1, 0.4, -0.01), vec3(0.2, 0.55, 0.05), 0.02, 0.05);
    d1 = smin(d1, d2, 0.03);


    vec2 res = vec2(d1, 2.0); // head, body and eye balls 2.0

    // eyes
    float d4 = sdSphere(sh - vec3(0.1, 0.28, 0.15), 0.05);
    if(d4 < d1)
    {
        res = vec2(d4, 3.0); // eyes 3.0 
    }

    d4 = sdSphere(sh - vec3(0.10, 0.28, 0.19), 0.02);
    if(d4 < d1)
    {
        res = vec2(d4, 4.0); // eye balls 4.0 
    }

    return res;
}


vec2 map(vec3 pos)
{
    vec2 d = sdBoy(pos);

    // add floor
    //float floor_d = pos.y - (-0.25);
    float floor_d = fPlane(pos, vec3(0,1,0), 0.25);
    
    //return d;
    return (floor_d < d.x) ? vec2(floor_d, 1.0) : d;
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(vec3(map(pos + e.xyy).x - map(pos - e.xyy).x,
                          map(pos + e.yxy).x - map(pos - e.yxy).x,
                          map(pos + e.yyx).x - map(pos - e.yyx).x));
}

#define MAX_MARCHING_STEPS 100
#define EPSILON 0.0001
vec2 rayCast(vec3 ro, vec3 rd, float start = 0.0, float end = 20.0)
{
    float m = -1.0;

    float t = start;

    for(int i = 0; i < MAX_MARCHING_STEPS; ++i)
    {
        vec3 pos = ro + t * rd;
        vec2 h = map(pos);

        m = h.y;

        if(h.x < EPSILON) break;

        t += h.x;

        if(t > end) break;
    }

    if(t > end) m = -1.0;

    return vec2(t, m);
}

vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    //vec2 xy = (2.0 * fragCoord.xy -size.xy)  / size.y;
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

float castShadow(vec3 ro, vec3 rd, float start = 0.001, float end = 20.0)
{
    float res = 1.0;

    //return res;

    float t = start;

    for(int i = 0; i < MAX_MARCHING_STEPS; ++i)
    {
        vec3 pos = ro + t * rd;
        float h = map(pos).x;

        // recording the closest thing
        res = min(res, 16.0 * h / t);

        if(t < start) break;

        t += h;

        if(t > end) break;
    }

    return clamp(res, 0.1, 1.0);
}

void main()
{
    //vec2 p = (2.0 * gl_FragCoord.xy -iResolution.xy)  / iResolution.y;

    //vec3 color = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
    //float f = smoothstep(0.2, 0.3, length(p));

    vec3 ro = eyePosition;
    //vec3 rd = normalize( mat3(inverse(view)) * vec3(p, -1.5));
    vec3 rd = normalize( mat3(inverse(view)) * rayDirection(camFov, iResolution.xy, gl_FragCoord.xy));

    // bgcolor, sky
    vec3 color = vec3(0.4, 0.75, 1.0) - 0.7 * rd.y;    

    vec2 tm = rayCast(ro, rd);

    if(tm.y >= 0.0)
    {
        float t = tm.x;

        vec3 pos = ro + t*rd;
        vec3 nor = calcNormal(pos);

        vec3 mate = vec3(0.18);

        if(tm.y < 1.5) // floor 
        {
            mate = vec3(0.05, 0.1, 0.02);
        }
        else if(tm.y < 2.5) // body and head
        {
            mate = vec3(0.2, 0.2, 0.02);
        }
        else if(tm.y < 3.5) // eyes
        {
            mate = vec3(0.4, 0.4, 0.4);
        }
        else //if(tm.y < 3.5) // eyes balls
        {
            mate = vec3(0.001);
        }

        vec3 sun_dir = normalize(vec3(0.6, 0.9, -0.2));
        float sun_dif = clamp(dot(nor, sun_dir), 0.0, 1.0);

        // shadow 1: step(rayCast(ro + rd * 0.001, sun_dir).y, 0.0);
        //float sun_sha = step(rayCast(ro + rd * 0.001, sun_dir).y, 0.0);
        // shadow 2:
        float sun_sha = castShadow(pos + nor * 0.001, sun_dir);
        float sky_diff = clamp(0.5 + 0.5 * dot(nor, vec3(0.0, 1.0, 0.0)) , 0.0, 1.0);
        float bou_diff = clamp(0.5 + 0.5 * dot(nor, vec3(0.0, -1.0, 0.0)) , 0.0, 1.0);

        color = mate * vec3(7.0, 4.5, 3.0) * sun_dif * sun_sha;
        color += mate * vec3(0.5, 0.8, 0.9) * sky_diff;
        color += mate * vec3(0.7, 0.3, 0.2) * bou_diff;
    }

    color = pow(color, vec3(0.4545));

    Out_Frag = vec4(color, 1.0);
}