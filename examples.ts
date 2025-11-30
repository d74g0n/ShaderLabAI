

export interface ExampleShader {
  name: string;
  code: string;
}

export const EXAMPLES: Record<string, ExampleShader> = {
  default: {
    name: "Default (Fractal)",
    code: `// #define SHOWONLYEDGES

#define WAVES 
#define BORDER 

#define RAY_STEPS 150

#define BRIGHTNESS 0.5
#define GAMMA 1.0
#define SATURATION .65


#define detail .001
#define t iTime*.05


const vec3 origin=vec3(-1.,.7,0.);
float det=0.0;


// 2D rotation function
mat2 rot(float a) {
	return mat2(cos(a),sin(a),-sin(a),cos(a));	
}

// "Amazing Surface" fractal
vec4 formula(vec4 p) {
		p.xz = abs(p.xz+1.)-abs(p.xz-1.)-p.xz;
		p.y-=.15; //.25
		p.xy*=rot(radians(35.));
		p=p*2./clamp(dot(p.xyz,p.xyz),.2,1.);
	return p;
}

// Distance function
float de(vec3 pos) {
#ifdef WAVES
	pos.y+=sin(pos.z-t*6.)*.15; //waves!
#endif
	float hid=0.;
	vec3 tpos=pos;
	tpos.z=abs(3.-mod(tpos.z,5.));
	vec4 p=vec4(tpos,1.);
	for (int i=0; i<4; i++) {p=formula(p);}
	float fr=(length(max(vec2(0.),p.yz-1.5))-1.)/p.w;
	float ro=max(abs(pos.x+1.)-.3,pos.y-.35);
		  ro=max(ro,-max(abs(pos.x+1.)-.1,pos.y-.5));
	pos.z=abs(.25-mod(pos.z,.5));
		  ro=max(ro,-max(abs(pos.z)-.2,pos.y-.3));
		  ro=max(ro,-max(abs(pos.z)-.01,-pos.y+.32));
	float d=min(fr,ro);
	return d;
}


// Camera path
vec3 path(float ti) {
	ti*=1.5;
	//vec3  p=vec3(sin(ti),(1.-sin(ti*3.))*.5,-ti*5.)*.5;
  
      return vec3(0.,0.75,1.-ti*150.)*0.2;
  //	return p;
  //  return vec3(ti);
}

// Calc normals, and here is edge detection, set to variable "edge"

float edge=1.;
vec3 normal(vec3 p) { 
	vec3 e = vec3(0.0,det*5.,0.0);

	float d1=de(p-e.yxx),d2=de(p+e.yxx);
	float d3=de(p-e.xyx),d4=de(p+e.xyx);
	float d5=de(p-e.xxy),d6=de(p+e.xxy);
	float d=de(p);
	edge=abs(d-0.5*(d2+d1))+abs(d-0.5*(d4+d3))+abs(d-0.5*(d6+d5));//edge finder
	edge=min(1.,pow(edge,.55)*15.);
	return normalize(vec3(d1-d2,d3-d4,d5-d6));
}


// Raymarching and 2D graphics

vec3 raymarch(in vec3 from, in vec3 dir) 

{
	edge=0.;
	vec3 p, norm;
	float d=100.;
	float totdist=0.;
	for (int i=0; i<RAY_STEPS; i++) {
		if (d>det && totdist<25.0) {
			p=from+totdist*dir;
			d=de(p);
			det=detail*exp(.13*totdist);
			totdist+=d; 
		}
	}
	vec3 col=vec3(0.);
	p-=(det-d)*dir;
	norm=normal(p);
#ifdef SHOWONLYEDGES
	col=1.-vec3(edge); // show wireframe version
#else
	col=(1.-abs(norm))*max(0.,1.-edge*.8); // set normal as color with dark edges
#endif		
	totdist=clamp(totdist,0.,26.);
	dir.y-=.02;
	float sunsize=7.-max(0.,texture2D(iChannel0,vec2(.6,.2)).x)*5.; // responsive sun size
	float an=atan(dir.x,dir.y)+iTime*1.5; // angle for drawing and rotating sun
	float s=pow(clamp(1.0-length(dir.xy)*sunsize-abs(.2-mod(an,.4)),0.,1.),.1); // sun
	float sb=pow(clamp(1.0-length(dir.xy)*(sunsize-.2)-abs(.2-mod(an,.4)),0.,1.),.1); // sun border
	float sg=pow(clamp(1.0-length(dir.xy)*(sunsize-4.5)-.5*abs(.2-mod(an,.4)),0.,1.),3.); // sun rays
	float y=mix(.45,1.2,pow(smoothstep(0.,1.,.75-dir.y),2.))*(1.-sb*.5); // gradient sky
	
	// set up background with sky and sun
	vec3 backg=vec3(0.5,0.,1.)*((1.2-s)*(1.-sg)*y+(1.-sb)*sg*vec3(1.,.8,0.15)*3.);
		 backg+=vec3(1.,.9,.1)*s;
		 backg=max(backg,sg*vec3(1.,.9,.5));
	
	col=mix(vec3(2.,.9,.3),col,exp(-.004*totdist*totdist));// distant fading to sun color
	if (totdist>25.) col=backg; // hit background
	col=pow(col,vec3(GAMMA))*BRIGHTNESS;
	col=mix(vec3(length(col)),col,SATURATION);
#ifdef SHOWONLYEDGES
	col=1.-vec3(length(col));
#else
	col*=vec3(1.,.9,.85);
#endif
	return col;
}

// get camera position
vec3 move(inout vec3 dir) {
	vec3 go=path(t);
	vec3 adv=path(t+.7);
	float hd=de(adv);
	vec3 advec=normalize(adv-go);
	float an=adv.x-go.x; an*=min(1.,abs(adv.z-go.z))*sign(adv.z-go.z)*.7;
	dir.xy*=mat2(cos(an),sin(an),-sin(an),cos(an));
    an=advec.y*1.7;
	dir.yz*=mat2(cos(an),sin(an),-sin(an),cos(an));
	an=atan(advec.x,advec.z);
	dir.xz*=mat2(cos(an),sin(an),-sin(an),cos(an));
	return go;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy*2.-1.;
	vec2 oriuv=uv;
	uv.y*=iResolution.y/iResolution.x;
	vec2 mouse=(iMouse.xy/iResolution.xy-.5)*3.;
	if (iMouse.z<1.) mouse=vec2(0.,-0.05);
	float fov=.9-max(0.,.7-iTime*.3);
	vec3 dir=normalize(vec3(uv*fov,1.));
	dir.yz*=rot(mouse.y);
	dir.xz*=rot(mouse.x);
	vec3 from=origin+move(dir);
	vec3 color=raymarch(from,dir); 
	#ifdef BORDER
	color=mix(vec3(0.),color,pow(max(0.,.95-length(oriuv*oriuv*oriuv*vec2(1.05,1.1))),.3));
	#endif
    
   // color = step(texture2D(iChannel0, fragCoord/8.).r, color);
    
    
	fragColor = vec4(color,1.);
}`
  },
  raycasting: {
    name: "Raycasting Sphere",
    code: `// SDF for a sphere
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// Compute normal at a point
vec3 getNormal(vec3 p) {
    float eps = 0.0001;
    return normalize(vec3(
        sdSphere(p + vec3(eps,0,0),1.0) - sdSphere(p - vec3(eps,0,0),1.0),
        sdSphere(p + vec3(0,eps,0),1.0) - sdSphere(p - vec3(0,eps,0),1.0),
        sdSphere(p + vec3(0,0,eps),1.0) - sdSphere(p - vec3(0,0,eps),1.0)
    ));
}

// Raymarching
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    const float MAX_DIST = 100.0;
    const int MAX_STEPS = 100;
    const float SURF_DIST = 0.001;

    for(int i=0;i<MAX_STEPS;i++){
        vec3 pos = ro + t*rd;
        float dist = sdSphere(pos,1.0);
        if(dist < SURF_DIST) return t;
        t += dist;
        if(t > MAX_DIST) break;
    }
    return -1.0;
}

// Diffuse lighting
vec3 getLight(vec3 p, vec3 normal, vec3 lightPos) {
    vec3 lightDir = normalize(lightPos - p);
    float diff = max(dot(normal, lightDir), 0.0);
    return vec3(1.0,0.8,0.6) * diff;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    vec3 ro = vec3(0.0,0.0,5.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    // Map mouse to light position
    vec2 mouse =  iMouse.xy / iResolution.xy; // 0..1
    vec3 lightPos = vec3(
        (mouse.x - 0.5) * 10.0,  // x from -5 to 5
        (-0.5 + mouse.y) * 10.0,  // y from -5 to 5
        5.0                       // fixed z
    );

    float t = rayMarch(ro, rd);

    if(t > 0.0) {
        vec3 pos = ro + t*rd;
        vec3 normal = getNormal(pos);
        vec3 color = getLight(pos, normal, lightPos);
        fragColor = vec4(color, 1.0);
    } else {
        fragColor = vec4(0.0);
    }
}`
  },
  ichannel0: {
    name: "iChannel0",
    code: `//  load image into iChannel0
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 uv2 = vec2(uv.x,1.0-uv.y);
    vec4 t = texture2D(iChannel0, uv2);
    fragColor = vec4(t.rgb, 1.0);
}`
  },
  blueMarble: {
    name: "Blue Marble",
    code: `float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise3(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0*C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0*C.xxx;
    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857; // 1/7
    vec3 ns = n_ * vec3(1.0,1.0,1.0) - vec3(0.0,0.0,0.0);
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x = x_*ns.x + ns.y;
    vec4 y = y_*ns.x + ns.y;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}



// Fractional Brownian Motion (FBM)
float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 0.5;
    for (int i = 0; i < 5; i++) {
        sum += amp * snoise3(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }

    
    float sum2 = 0.0;
    amp = 0.5;
    freq = 1.5;
    for (int i = 0; i < 5; i++) {
        sum2 += amp * snoise3(p * freq);
        freq *= 2.2;
        amp *= 0.5;
    }    


    return sum+sum2;


}

// Planet parameters
const float PLANET_RADIUS = 1.0;
const float CLOUD_ALTITUDE = 0.5; // Clouds slightly above surface
const float ATMOSPHERE_THICKNESS = 0.05; // Atmosphere extends from radius to radius + thickness

// Noise scales
const float LAND_NOISE_SCALE = 2.0;
const float CLOUD_NOISE_SCALE = 2.0;

// Noise thresholds/levels (fbm returns values roughly -0.5 to 0.5 for 5 octaves)
const float WATER_LEVEL = 0.05; 
const float LAND_LEVEL_START = -0.5;
const float LAND_LEVEL_END = 0.7;

// Colors
const vec3 WATER_DEEP_COLOR = vec3(0.05, 0.1, 0.5);
const vec3 WATER_SHALLOW_COLOR = vec3(0.1, 0.1, 0.4);
const vec3 LAND_COLOR_LOW = vec3(0.3, 0.3, 0.1);
const vec3 LAND_COLOR_HIGH = vec3(0.2, 0.2, 0.1);
const vec3 SNOW_COLOR = vec3(0.1, 0.1, 0.95);
const vec3 CLOUD_COLOR = vec3(0.95, 0.95, 0.95);
const vec3 ATMOSPHERE_COLOR = vec3(0.3, 0.6, 1.0); // Blue-ish atmosphere

// Animation speeds
const float PLANET_NOISE_SPEED = 0.0005;
const float CLOUD_NOISE_SPEED = 0.08;

// Compute normal at a point
vec3 getNormal(vec3 p) {
    float eps = 0.0001;
    // The SDF for the planet surface is sdSphere(p, PLANET_RADIUS)
    return normalize(vec3(
        sdSphere(p + vec3(eps,0,0), PLANET_RADIUS) - sdSphere(p - vec3(eps,0,0), PLANET_RADIUS),
        sdSphere(p + vec3(0,eps,0), PLANET_RADIUS) - sdSphere(p - vec3(0,eps,0), PLANET_RADIUS),
        sdSphere(p + vec3(0,0,eps), PLANET_RADIUS) - sdSphere(p - vec3(0,0,eps), PLANET_RADIUS)
    ));
}

// Raymarching
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    const float MAX_DIST = 100.0;
    const int MAX_STEPS = 100;
    const float SURF_DIST = 0.005;

    for(int i=0;i<MAX_STEPS;i++){
        vec3 pos = ro + t*rd;
        float dist = sdSphere(pos, PLANET_RADIUS); // Use PLANET_RADIUS
        if(dist < SURF_DIST) return t;
        t += dist;
        if(t > MAX_DIST) break;
    }
    return -1.0; // No hit
}

// Get the base planet surface color (land, water, snow)
vec3 getPlanetSurfaceColor(vec3 p, vec3 normal) {
    // Add time-based offset for planet rotation effect
    vec3 p_animated = p + vec3(0.0, iTime * PLANET_NOISE_SPEED, 0.0); 
    float n = fbm(p_animated * LAND_NOISE_SCALE);

    vec3 surfaceColor;
    if (n < WATER_LEVEL) { // Water
        float waterDepth = smoothstep(-0.5, WATER_LEVEL, n); // Normalize noise to 0-1 for depth mix
        surfaceColor = mix(WATER_DEEP_COLOR, WATER_SHALLOW_COLOR, waterDepth);
    } else { // Land
        float landHeight = smoothstep(LAND_LEVEL_START, LAND_LEVEL_END, n); // Normalize noise to 0-1 for height mix
        surfaceColor = mix(LAND_COLOR_LOW, LAND_COLOR_HIGH, landHeight);
    }

    // Add polar caps / snow based on Y-coordinate (or dot product with up vector)
    float poleInfluence = pow(abs(p.y), 6.0); // Higher power for sharper caps
    surfaceColor = mix(surfaceColor, SNOW_COLOR, poleInfluence);

    return surfaceColor;
}

// Get cloud layer color, blending with existing surface color
vec3 getCloudsColor(vec3 p, vec3 surfaceColor, vec3 lightDir, vec3 normal) {
    // Sample clouds slightly above the surface
    vec3 cloudSamplePos = p + normal * CLOUD_ALTITUDE;
    vec3 cloud_p_animated = cloudSamplePos + vec3(0.0, iTime * CLOUD_NOISE_SPEED, 0.0);
    float cloudDensity = fbm(cloud_p_animated * CLOUD_NOISE_SCALE);

    const float CLOUD_THRESHOLD = -0.3; // Noise range is roughly -0.5 to 0.5
    const float CLOUD_FEATHER = 0.98; // Smoothness of cloud edges

    if (cloudDensity > CLOUD_THRESHOLD) {
        float alpha = smoothstep(CLOUD_THRESHOLD, CLOUD_THRESHOLD + CLOUD_FEATHER, cloudDensity);
        // Simple lighting for clouds, brighter than surface
        vec3 litCloudColor = CLOUD_COLOR * max(0.0, dot(normal, lightDir)) * 1.0; 
        return mix(surfaceColor, litCloudColor, alpha);
    }
    return surfaceColor;
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    vec3 ro = vec3(0.0,0.0,5.0); // Ray origin (camera position)
    vec3 rd = normalize(vec3(uv, -1.0)); // Ray direction

    // Map mouse to light position
    vec2 mouse = iMouse.xy / iResolution.xy; // mouse.xy from 0..1
    vec3 lightPos = vec3(
        (mouse.x - 0.5) * 10.0,  // x from -5 to 5
        (-0.5 + mouse.y) * 10.0, // y from -5 to 5
        5.0                       // fixed z
    );
    // Light direction from planet center (assuming planet at origin) to light source
    vec3 lightDir = normalize(lightPos - vec3(0.0));

    float t = rayMarch(ro, rd); // Raymarch to find closest surface hit

    if(t > 0.0) { // Ray hit the planet surface
        vec3 pos = ro + t*rd; // Hit position
        vec3 normal = getNormal(pos); // Surface normal at hit position
        vec3 viewDir = normalize(ro - pos); // Direction from hit point to camera

        // 1. Get base planet surface color (land/water/snow)
        vec3 finalColor = getPlanetSurfaceColor(pos, normal);

        // 2. Apply diffuse lighting
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 lightStrength = vec3(1.0,0.8,0.6) * diff; // Original light color and diffuse factor
        finalColor *= lightStrength;

        // 3. Add cloud layer
        finalColor = getCloudsColor(pos, finalColor, lightDir, normal);

        // 4. Add thin atmospheric glow (rim effect on the planet surface)
        // This makes the edge of the planet slightly glow with atmospheric color
        float atmosphereFresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0); // Fresnel effect
        vec3 atmosphericGlow = ATMOSPHERE_COLOR * atmosphereFresnel * 1.5; // Scale intensity
        finalColor += atmosphericGlow; // Additive blend for glow

        fragColor = vec4(finalColor, 1.0);
    } else { // Ray missed the planet (background / space)
        vec3 skyColor = vec3(0.02, 0.02, 0.05); // Deep space color
        fragColor = vec4(skyColor, 1.0);

        // Add atmospheric glow around the planet's silhouette
        // Find the closest point of the ray to the planet center (origin)
        float b = dot(ro, rd);
        float t_closest = -b;
        vec3 p_closest = ro + t_closest * rd;
        float dist_closest = length(p_closest);

        // If the ray passes through or near the atmosphere
        if (dist_closest < PLANET_RADIUS + ATMOSPHERE_THICKNESS && t_closest > 0.0) {
            // Calculate alpha for atmospheric glow based on distance to the planet
            float alpha = smoothstep(PLANET_RADIUS + ATMOSPHERE_THICKNESS, PLANET_RADIUS, dist_closest);
            // Stronger glow at grazing angles
            alpha *= pow(1.0 - abs(dot(normalize(p_closest), rd)), 2.0); 
            
            fragColor.rgb += ATMOSPHERE_COLOR * alpha * 0.8; // Additive glow for background rays
        }
    }
}`
  },
  noise: {
    name: "Noise (Procedural)",
    code: `// d74g0n's procedural noise functions:

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise3(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0*C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0*C.xxx;
    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857; // 1/7
    vec3 ns = n_ * vec3(1.0,1.0,1.0) - vec3(0.0,0.0,0.0);
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x = x_*ns.x + ns.y;
    vec4 y = y_*ns.x + ns.y;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractional Brownian Motion (FBM)
float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 0.5;
    for (int i = 0; i < 5; i++) {
        sum += amp * snoise3(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    float sum2 = 0.0;
    amp = 0.5;
    freq = 1.5;
    for (int i = 0; i < 5; i++) {
        sum2 += amp * snoise3(p * freq);
        freq *= 2.2;
        amp *= 0.5;
    }    
    return sum+sum2;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
    float zspeed = sin(iTime*0.005);
    vec3 noise_coords = vec3(uv.x*2.,uv.y*2.,100.0*zspeed);
    float lr = snoise3(noise_coords);
    float lg = fbm(noise_coords);
    float lb = snoise3(noise_coords*0.5) + fbm(noise_coords*0.5);
    // plasma mix::
    fragColor = vec4(lr*0.5+lg*0.5+lb*0.1,lr*0.5+lg*0.1+lb*0.5,lr*0.1+lg*0.5+lb*0.5,1.0);
//  fragColor = vec4(vec3(lb),1.0); // what fbm + snoise3 looks like
//  fragColor = vec4(vec3(lg),1.0); // what fbm looks like
//  fragColor = vec4(vec3(lr),1.0); // what snoise3 looks like
}`
  }
};