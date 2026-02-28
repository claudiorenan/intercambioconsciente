/**
 * Intercambio Consciente — Globe Module
 * Extracted from app.js for lazy-loading.
 * Requires THREE (Three.js) to be loaded before this script.
 *
 * Exposes window.Globe = { init, animateCounters }
 */

(function () {
    'use strict';

    /**
     * Animate a single element from 0 to `target` using an eased count-up.
     * @param {HTMLElement} el
     * @param {number} target
     */
    function _countUp(el, target) {
        var duration = 1500;
        var start = performance.now();
        var step = function (now) {
            var progress = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /**
     * Observe `.map-stat-number[data-target]` elements and animate them when
     * they scroll into view.  Works independently of Three.js.
     */
    function animateCounters() {
        var counters = document.querySelectorAll('.map-stat-number[data-target]');
        if (!counters.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    var target = parseInt(el.dataset.target, 10);
                    _countUp(el, target);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(function (c) { observer.observe(c); });
    }

    /**
     * Initialise the Three.js interactive globe.
     * @param {string} containerId — id of the wrapper element
     * @param {string} canvasId    — id of the <canvas> element
     * @returns {boolean} true if the globe was created, false otherwise
     */
    function init(containerId, canvasId) {
        var container = document.getElementById(containerId);
        var canvas    = document.getElementById(canvasId);

        if (!container || !canvas) {
            console.warn('[Globe] Container or canvas element not found.');
            return false;
        }

        if (typeof THREE === 'undefined') {
            console.warn('[Globe] THREE is not available — globe will not render.');
            return false;
        }

        // --- Scene setup ---
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(
            45, container.offsetWidth / container.offsetHeight, 1, 2000
        );
        camera.position.set(0, 30, 280);
        camera.lookAt(0, 0, 0);

        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        var R = 100;
        var globeGroup = new THREE.Group();
        scene.add(globeGroup);

        // --- Globe sphere ---
        var globeGeo = new THREE.SphereGeometry(R, 64, 64);
        var globeMat = new THREE.MeshPhongMaterial({
            color: 0x120a30,
            emissive: 0x1a0a40,
            emissiveIntensity: 0.3,
            shininess: 15,
            transparent: true,
            opacity: 0.92,
        });
        globeGroup.add(new THREE.Mesh(globeGeo, globeMat));
        window._globeMaterial = globeMat;

        // --- Wireframe grid ---
        var wireGeo = new THREE.SphereGeometry(R + 0.3, 36, 18);
        var wireMat = new THREE.MeshBasicMaterial({
            color: 0x7C3AED, wireframe: true, transparent: true, opacity: 0.05,
        });
        globeGroup.add(new THREE.Mesh(wireGeo, wireMat));

        // --- Atmosphere glow (outer, Fresnel) ---
        var atmosVS = [
            'varying vec3 vNormal;',
            'void main() {',
            '  vNormal = normalize(normalMatrix * normal);',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
        ].join('\n');
        var atmosFS = [
            'varying vec3 vNormal;',
            'void main() {',
            '  float d = dot(vNormal, vec3(0.0, 0.0, 1.0));',
            '  float intensity = pow(max(0.0, 0.65 - d), 2.0);',
            '  gl_FragColor = vec4(0.486, 0.227, 0.929, intensity * 0.7);',
            '}'
        ].join('\n');
        var atmosMat = new THREE.ShaderMaterial({
            vertexShader: atmosVS,
            fragmentShader: atmosFS,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
        });
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.2, 64, 64), atmosMat));

        // --- Inner rim glow ---
        var innerFS = [
            'varying vec3 vNormal;',
            'void main() {',
            '  float d = dot(vNormal, vec3(0.0, 0.0, 1.0));',
            '  float intensity = pow(max(0.0, 0.45 - d), 3.0);',
            '  gl_FragColor = vec4(0.39, 0.4, 0.95, intensity * 0.4);',
            '}'
        ].join('\n');
        scene.add(new THREE.Mesh(
            new THREE.SphereGeometry(R * 1.02, 64, 64),
            new THREE.ShaderMaterial({
                vertexShader: atmosVS, fragmentShader: innerFS,
                blending: THREE.AdditiveBlending, side: THREE.FrontSide,
                transparent: true, depthWrite: false,
            })
        ));

        // --- Lights ---
        scene.add(new THREE.AmbientLight(0x404070, 0.5));
        var mainLight = new THREE.DirectionalLight(0xA78BFA, 0.8);
        mainLight.position.set(200, 100, 200);
        scene.add(mainLight);
        var rimLight = new THREE.DirectionalLight(0xF43F5E, 0.3);
        rimLight.position.set(-200, -50, -200);
        scene.add(rimLight);

        // --- lat/lng -> 3D ---
        var toVec3 = function (lat, lng, r) {
            var phi = (90 - lat) * Math.PI / 180;
            var theta = (lng + 180) * Math.PI / 180;
            return new THREE.Vector3(
                -(r * Math.sin(phi) * Math.cos(theta)),
                r * Math.cos(phi),
                r * Math.sin(phi) * Math.sin(theta)
            );
        };

        // --- Cities ---
        var cities = [
            { lat: -23.55, lng: -46.63, label: 'Brasil',    color: 0xC4B5FD, isOrigin: true },
            { lat: 40.71,  lng: -74.01, label: 'Nova York',  color: 0x6366F1 },
            { lat: 43.65,  lng: -79.38, label: 'Toronto',    color: 0x10B981 },
            { lat: 25.76,  lng: -80.19, label: 'Miami',      color: 0x06B6D4 },
            { lat: 51.51,  lng:  -0.13, label: 'Londres',    color: 0xA855F7 },
            { lat: 53.35,  lng:  -6.26, label: 'Dublin',     color: 0x8B5CF6 },
            { lat: 38.72,  lng:  -9.14, label: 'Lisboa',     color: 0xF59E0B },
            { lat: 48.86,  lng:   2.35, label: 'Paris',      color: 0xF43F5E },
            { lat: 52.52,  lng:  13.41, label: 'Berlim',     color: 0x06B6D4 },
            { lat: -33.87, lng: 151.21, label: 'Sydney',     color: 0x34D399 },
            { lat: 35.68,  lng: 139.69, label: 'Toquio',     color: 0xEC4899 },
            { lat: -34.60, lng: -58.38, label: 'B. Aires',   color: 0x10B981 },
        ];

        // --- City markers ---
        var originGlows = [];
        cities.forEach(function (city) {
            var pos = toVec3(city.lat, city.lng, R + 1);
            var size = city.isOrigin ? 2.5 : 1.3;

            // Dot
            var dot = new THREE.Mesh(
                new THREE.SphereGeometry(size, 16, 16),
                new THREE.MeshBasicMaterial({ color: city.color })
            );
            dot.position.copy(pos);
            globeGroup.add(dot);

            // Glow halo
            var glow = new THREE.Mesh(
                new THREE.SphereGeometry(size * 3, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: city.color, transparent: true,
                    opacity: city.isOrigin ? 0.2 : 0.08,
                })
            );
            glow.position.copy(pos);
            globeGroup.add(glow);

            if (city.isOrigin) originGlows.push(glow);
        });

        // --- Arcs + travelers ---
        var origin = cities[0];
        var oPos = toVec3(origin.lat, origin.lng, R + 1);
        var travelers = [];

        cities.filter(function (c) { return !c.isOrigin; }).forEach(function (city) {
            var dPos = toVec3(city.lat, city.lng, R + 1);

            // Control point: midpoint pushed outward
            var mid = new THREE.Vector3().addVectors(oPos, dPos).multiplyScalar(0.5);
            var dist = oPos.distanceTo(dPos);
            mid.normalize().multiplyScalar(R + dist * 0.45);

            var curve = new THREE.QuadraticBezierCurve3(oPos.clone(), mid, dPos.clone());
            var pts = curve.getPoints(80);

            // Arc line
            globeGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color: city.color, transparent: true, opacity: 0.3 })
            ));

            // Traveler dot
            var tDot = new THREE.Mesh(
                new THREE.SphereGeometry(1.8, 12, 12),
                new THREE.MeshBasicMaterial({ color: city.color, transparent: true })
            );
            globeGroup.add(tDot);

            // Traveler glow trail
            var tGlow = new THREE.Mesh(
                new THREE.SphereGeometry(5, 12, 12),
                new THREE.MeshBasicMaterial({ color: city.color, transparent: true, opacity: 0.12 })
            );
            globeGroup.add(tGlow);

            travelers.push({
                curve: curve, dot: tDot, trail: tGlow,
                t: Math.random(),
                speed: 0.0015 + Math.random() * 0.002,
            });
        });

        // --- Stars ---
        var starCount = 1500;
        var starsGeo = new THREE.BufferGeometry();
        var starPos = new Float32Array(starCount * 3);
        for (var i = 0; i < starCount; i++) {
            var sr = 500 + Math.random() * 500;
            var sTheta = Math.random() * Math.PI * 2;
            var sPhi = Math.acos(2 * Math.random() - 1);
            starPos[i * 3]     = sr * Math.sin(sPhi) * Math.cos(sTheta);
            starPos[i * 3 + 1] = sr * Math.sin(sPhi) * Math.sin(sTheta);
            starPos[i * 3 + 2] = sr * Math.cos(sPhi);
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({
            color: 0xffffff, size: 0.8, transparent: true, opacity: 0.5, sizeAttenuation: true,
        })));

        // --- Mouse interaction ---
        var tgtRY = 0, tgtRX = 0, curRY = 0, curRX = 0;
        container.addEventListener('mousemove', function (e) {
            var rect = container.getBoundingClientRect();
            tgtRY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
            tgtRX = ((e.clientY - rect.top) / rect.height - 0.5) * 0.3;
        });
        container.addEventListener('mouseleave', function () { tgtRY = 0; tgtRX = 0; });
        container.addEventListener('touchmove', function (e) {
            var rect = container.getBoundingClientRect();
            var touch = e.touches[0];
            tgtRY = ((touch.clientX - rect.left) / rect.width - 0.5) * 0.6;
            tgtRX = ((touch.clientY - rect.top) / rect.height - 0.5) * 0.3;
        }, { passive: true });
        container.addEventListener('touchend', function () { tgtRY = 0; tgtRX = 0; });

        // --- Animation loop ---
        var autoRot = -0.8; // start showing Americas
        var time = 0;

        var animate = function () {
            requestAnimationFrame(animate);
            time += 0.016;
            autoRot += 0.002;

            // Smooth mouse follow
            curRY += (tgtRY - curRY) * 0.05;
            curRX += (tgtRX - curRX) * 0.05;

            globeGroup.rotation.y = autoRot + curRY;
            globeGroup.rotation.x = curRX;

            // Animate travelers along arcs
            travelers.forEach(function (tv) {
                tv.t += tv.speed;
                if (tv.t > 1) tv.t = 0;

                var p = tv.curve.getPoint(tv.t);
                tv.dot.position.copy(p);
                tv.trail.position.copy(p);

                var fade = tv.t < 0.08 ? tv.t / 0.08 : (tv.t > 0.92 ? (1 - tv.t) / 0.08 : 1);
                tv.dot.material.opacity = fade;
                tv.trail.material.opacity = 0.12 * fade;
                tv.dot.scale.setScalar(0.3 + fade * 0.7);
                tv.trail.scale.setScalar(0.3 + fade * 0.7);
            });

            // Pulse origin glow
            originGlows.forEach(function (g) { g.scale.setScalar(1 + Math.sin(time * 2) * 0.2); });

            renderer.render(scene, camera);
        };
        animate();

        // --- Resize ---
        window.addEventListener('resize', function () {
            var w = container.offsetWidth;
            var h = container.offsetHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });

        return true;
    }

    // Expose on window
    window.Globe = {
        init: init,
        animateCounters: animateCounters,
        /** Exposed for testing only */
        _countUp: _countUp,
    };
})();
