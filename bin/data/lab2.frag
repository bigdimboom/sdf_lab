#version 450

uniform vec2 iResolution;
uniform float iTime;

uniform vec3 eyePosition;
uniform vec3 lookAt;
uniform mat4 view;

uniform vec3 bgColor;
out vec4 Out_Frag;

float sdSphere(vec3 pos, float s)
{
    return length(pos) - s;
}

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
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

float map(vec3 pos)
{
    float d1 = sdSphere(pos, 0.25);
    //float d1 = sdBox(pos, vec3(0.25));
    //float d1 = sdTorus(pos, vec2(0.25, 0.1));
    float d2 = pos.y - (-0.25);
    return min(d1, d2);
}

vec3 calcNormal(vec3 pos)
{
    vec2 e = vec2(0.0001, 0.0);
    return normalize(vec3(map(pos + e.xyy) - map(pos - e.xyy),
                          map(pos + e.yxy) - map(pos - e.yxy),
                          map(pos + e.yyx) - map(pos - e.yyx)));
}

float rayCast(vec3 ro, vec3 rd)
{
    float t = 0.0f;

    for(int i = 0; i < 100; ++i)
    {
        vec3 pos = ro + t * rd;
        float h = map(pos);

        if(h < 0.001) break;

        t += h;

        if(t > 20.0) break;
    }

    if(t > 20.0) t = -1.0;

    return t;
}

void main()
{
    vec2 p = (2.0 * gl_FragCoord.xy -iResolution.xy)  / iResolution.y;

    //vec3 color = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
    //float f = smoothstep(0.2, 0.3, length(p));

    vec3 ro = eyePosition;
    vec3 rd = normalize( mat3(inverse(view)) * vec3(p, -1.5));

    vec3 color = bgColor- .3 * rd.y;

    

    float t = rayCast(ro, rd);

    if(t > 0.0)
    {
        vec3 pos = ro + t*rd;
        vec3 nor = calcNormal(pos);

        vec3 mate = vec3(0.18);

        vec3 sun_dir = normalize(vec3(0.8, 0.4, -0.2));
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