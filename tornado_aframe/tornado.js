import AFRAME from "aframe";
import * as THREE from "three";
import GUI from "lil-gui";

const noiseChunk = `
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){ 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod(i, 289.0 ); 
        vec4 p = permute( permute( permute( 
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 1.0/7.0; 
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z *ns.z); 
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ ); 
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }
`;

AFRAME.registerComponent("tornado", {
  schema: {
    show_gui: { type: "boolean", default: true },
  },
  init: function () {
    this.params = {
      baseWidth: 4.0,
      stemPinch: 0.3808,
      bulbWidth: 1.0,
      bulbHeight: 10.0,
      totalHeight: 12.0,
      coreColor: "#fffdb0",
      midColor: "#ffaa00",
      edgeColor: "#aa2200",
      flowSpeed: 0.345,
      twistSpeed: 0.2,
      twistStrength: 1.0,
      noiseScale: 1.0,
      roughness: 2.0,
      brightness: 1.5,
      rimColor: "#aaccff",
      shellPulseSpeed: 0.345,
      shellDisplacement: 0.2,
      fresnelPower: 5.0,
      shellOpacity: 0.8,
      poolSize: 3.0,
      poolColor: "#00e1ff",
    };

    this.plasmaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorCore: { value: new THREE.Color(this.params.coreColor) },
        uColorMid: { value: new THREE.Color(this.params.midColor) },
        uColorEdge: { value: new THREE.Color(this.params.edgeColor) },
        uFlowSpeed: { value: this.params.flowSpeed },
        uTwistSpeed: { value: this.params.twistSpeed },
        uTwistStrength: { value: this.params.twistStrength },
        uNoiseScale: { value: this.params.noiseScale },
        uRoughness: { value: this.params.roughness },
        uBrightness: { value: this.params.brightness },
        uHeight: { value: this.params.totalHeight },
      },
      vertexShader: `
        uniform float uTime; uniform float uTwistSpeed; uniform float uTwistStrength;
        varying vec3 vPos; varying vec3 vNormal; varying vec3 vViewPosition;
        ${noiseChunk}
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vec3 pos = position;
            float twistAmt = uTwistStrength * pos.y; 
            float angle = twistAmt - uTime * uTwistSpeed;
            float s = sin(angle); float c = cos(angle);
            mat2 rot = mat2(c, -s, s, c);
            pos.xz = rot * pos.xz;
            float wave = snoise(vec3(pos.x * 2.0, pos.y - uTime, pos.z * 2.0));
            pos += normal * wave * 0.05;
            vPos = pos;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime; uniform vec3 uColorCore; uniform vec3 uColorMid; uniform vec3 uColorEdge;
        uniform float uFlowSpeed; uniform float uNoiseScale; uniform float uRoughness; uniform float uBrightness; uniform float uHeight;
        varying vec3 vPos; varying vec3 vNormal;
        ${noiseChunk}
        void main() {
            vec3 flowPos = vPos * uNoiseScale;
            flowPos.y -= uTime * uFlowSpeed; 
            float n1 = snoise(flowPos);
            vec3 warp = flowPos + vec3(n1 * 0.5);
            float n2 = snoise(warp * uRoughness + vec3(0.0, uTime * 0.2, 0.0));
            float ribbon = sin(n2 * 10.0 + flowPos.y * 2.0); 
            ribbon = smoothstep(-0.2, 0.8, ribbon);
            vec3 finalColor = mix(uColorEdge, uColorMid, ribbon);
            float coreIntensity = smoothstep(0.6, 1.0, n2 + ribbon * 0.5);
            finalColor = mix(finalColor, uColorCore, coreIntensity);
            float heightFactor = smoothstep(0.0, uHeight, vPos.y);
            finalColor *= mix(1.2, 0.8, heightFactor);
            float opacity = 0.6 + 0.4 * ribbon;
            float groundFade = smoothstep(0.0, 0.3, vPos.y);
            gl_FragColor = vec4(finalColor * uBrightness, opacity * groundFade);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.shellMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorRim: { value: new THREE.Color(this.params.rimColor) },
        uPulseSpeed: { value: this.params.shellPulseSpeed },
        uDisplacement: { value: this.params.shellDisplacement },
        uFresnelPower: { value: this.params.fresnelPower },
        uOpacity: { value: this.params.shellOpacity },
      },
      vertexShader: `
        uniform float uTime; uniform float uPulseSpeed; uniform float uDisplacement;
        varying vec3 vNormal; varying vec3 vViewPosition;
        ${noiseChunk}
        void main() {
            vec3 pos = position;
            float breath = snoise(vec3(pos.x, pos.y * 0.5 + uTime * uPulseSpeed, pos.z));
            pos += normal * breath * uDisplacement; 
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            vViewPosition = -mvPosition.xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorRim; uniform float uFresnelPower; uniform float uOpacity;
        varying vec3 vNormal; varying vec3 vViewPosition;
        void main() {
            vec3 viewDir = normalize(vViewPosition);
            vec3 normal = normalize(vNormal);
            float fresnel = dot(viewDir, normal);
            fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
            float rim = pow(fresnel, uFresnelPower); 
            float alpha = rim * uOpacity;
            gl_FragColor = vec4(uColorRim * 2.0, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    this.floorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(this.params.poolColor) },
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
        ${noiseChunk}
        void main() {
            vec2 uv = vUv - 0.5;
            float dist = length(uv) * 2.0;
            float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
            float angle = atan(uv.y, uv.x);
            float noiseVal = snoise(vec3(uv * 5.0, uTime * 0.5));
            float spiral = sin(dist * 10.0 - uTime * 2.0 + angle * 2.0);
            vec3 color = uColor * (1.5 + spiral * 0.5);
            gl_FragColor = vec4(color, alpha * 0.6 * (1.0 + noiseVal * 0.2));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.root = new THREE.Group();
    this.el.setObject3D("mesh", this.root);

    this.generateGeometry = () => {
      if (this.coreMesh) {
        this.coreMesh.geometry.dispose();
        this.root.remove(this.coreMesh);
      }
      if (this.shellMesh) {
        this.shellMesh.geometry.dispose();
        this.root.remove(this.shellMesh);
      }

      const points = [];
      points.push(new THREE.Vector2(this.params.baseWidth, 0));
      points.push(new THREE.Vector2(this.params.baseWidth * 0.5, 0.5));
      points.push(
        new THREE.Vector2(this.params.stemPinch, this.params.bulbHeight * 0.3)
      );
      points.push(
        new THREE.Vector2(
          this.params.stemPinch * 1.5,
          this.params.bulbHeight * 0.5
        )
      );
      points.push(
        new THREE.Vector2(this.params.bulbWidth, this.params.bulbHeight * 0.8)
      );
      points.push(
        new THREE.Vector2(
          this.params.bulbWidth * 0.6,
          this.params.bulbHeight * 0.95
        )
      );
      points.push(new THREE.Vector2(0.0, this.params.totalHeight));

      const geometryCurve = new THREE.SplineCurve(points);
      const geometry = new THREE.LatheGeometry(
        geometryCurve.getPoints(100),
        80
      );

      this.plasmaMaterial.uniforms.uHeight.value = this.params.totalHeight;
      this.coreMesh = new THREE.Mesh(geometry, this.plasmaMaterial);
      this.root.add(this.coreMesh);
      this.shellMesh = new THREE.Mesh(geometry.clone(), this.shellMaterial);
      this.shellMesh.scale.set(1.05, 1.02, 1.05);
      this.root.add(this.shellMesh);
    };

    this.generateGeometry();

    const floorGeometry = new THREE.PlaneGeometry(5, 5);
    this.floorMesh = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = 0.05;
    this.floorMesh.scale.set(
      this.params.poolSize,
      this.params.poolSize,
      this.params.poolSize
    );
    this.root.add(this.floorMesh);

    if (this.data.show_gui) {
      this.gui = new GUI({ title: "Vortex Controller" });
      const fShape = this.gui.addFolder("Geometry");
      fShape
        .add(this.params, "baseWidth", 0.5, 4.0)
        .onChange(this.generateGeometry);
      fShape
        .add(this.params, "stemPinch", 0.1, 1.5)
        .onChange(this.generateGeometry);
      fShape
        .add(this.params, "bulbWidth", 1.0, 4.0)
        .onChange(this.generateGeometry);
      fShape
        .add(this.params, "bulbHeight", 3.0, 10.0)
        .onChange(this.generateGeometry);
      fShape
        .add(this.params, "totalHeight", 4.0, 12.0)
        .onChange(this.generateGeometry);
      const fPlasma = this.gui.addFolder("Plasma");
      fPlasma
        .addColor(this.params, "coreColor")
        .onChange((v) => this.plasmaMaterial.uniforms.uColorCore.value.set(v));
      fPlasma
        .addColor(this.params, "midColor")
        .onChange((v) => this.plasmaMaterial.uniforms.uColorMid.value.set(v));
      fPlasma
        .addColor(this.params, "edgeColor")
        .onChange((v) => this.plasmaMaterial.uniforms.uColorEdge.value.set(v));
      fPlasma
        .add(this.params, "brightness", 0.5, 3.0)
        .onChange((v) => (this.plasmaMaterial.uniforms.uBrightness.value = v));
      fPlasma
        .add(this.params, "flowSpeed", 0.0, 3.0)
        .onChange((v) => (this.plasmaMaterial.uniforms.uFlowSpeed.value = v));
      fPlasma
        .add(this.params, "twistSpeed", -1.0, 1.0)
        .onChange((v) => (this.plasmaMaterial.uniforms.uTwistSpeed.value = v));
      fPlasma
        .add(this.params, "twistStrength", 0.0, 3.0)
        .onChange(
          (v) => (this.plasmaMaterial.uniforms.uTwistStrength.value = v)
        );
      fPlasma
        .add(this.params, "noiseScale", 0.5, 3.0)
        .onChange((v) => (this.plasmaMaterial.uniforms.uNoiseScale.value = v));
      fPlasma
        .add(this.params, "roughness", 1.0, 5.0)
        .onChange((v) => (this.plasmaMaterial.uniforms.uRoughness.value = v));
      const fShell = this.gui.addFolder("Force Field");
      fShell
        .addColor(this.params, "rimColor")
        .onChange((v) => this.shellMaterial.uniforms.uColorRim.value.set(v));
      fShell
        .add(this.params, "shellOpacity", 0.0, 1.0)
        .onChange((v) => (this.shellMaterial.uniforms.uOpacity.value = v));
      fShell
        .add(this.params, "fresnelPower", 1.0, 5.0)
        .onChange((v) => (this.shellMaterial.uniforms.uFresnelPower.value = v));
      fShell
        .add(this.params, "shellPulseSpeed", 0.0, 3.0)
        .onChange((v) => (this.shellMaterial.uniforms.uPulseSpeed.value = v));
      fShell
        .add(this.params, "shellDisplacement", 0.0, 0.2)
        .onChange((v) => (this.shellMaterial.uniforms.uDisplacement.value = v));
      const fFloor = this.gui.addFolder("Floor");
      fFloor
        .addColor(this.params, "poolColor")
        .onChange((v) => this.floorMaterial.uniforms.uColor.value.set(v));
      fFloor
        .add(this.params, "poolSize", 0.0, 3.0)
        .onChange((v) => this.floorMesh.scale.set(v, v, v));
    }
  },
  tick: function (t, dt) {
    const time = t / 1000;
    this.plasmaMaterial.uniforms.uTime.value = time;
    this.shellMaterial.uniforms.uTime.value = time;
    this.floorMaterial.uniforms.uTime.value = time;
  },
  remove: function () {
    if (this.gui) this.gui.destroy();
    if (this.coreMesh) this.coreMesh.geometry.dispose();
    if (this.shellMesh) this.shellMesh.geometry.dispose();
    if (this.floorMesh) this.floorMesh.geometry.dispose();
    this.plasmaMaterial.dispose();
    this.shellMaterial.dispose();
    this.floorMaterial.dispose();
  },
});
