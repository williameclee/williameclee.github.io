function createShader(gl, vsSource, fsSource) {
	const vsShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vsShader, vsSource);
	gl.compileShader(vsShader);
	if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS))
		console.log("vertex shader compile error: " + gl.getShaderInfoLog(vsShader));

	const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fsShader, fsSource);
	gl.compileShader(fsShader);
	if (!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS))
		console.log("fragment shader compile error: " + gl.getShaderInfoLog(fsShader));

	var shader = gl.createProgram();
	gl.attachShader(shader, vsShader);
	gl.attachShader(shader, fsShader);
	gl.linkProgram(shader);

	return shader;
}

const pointVertexShader = `
		attribute vec2 attrPosition;
		attribute vec3 attrColor;
		uniform vec2 domainSize;
		uniform float pointSize;
		uniform float drawDisk;

		varying vec3 fragColor;
		varying float fragDrawDisk;

		void main() {
			vec4 screenTransform = 
				vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
			gl_Position =
				vec4(attrPosition * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

			gl_PointSize = pointSize;
			fragColor = attrColor;
			fragDrawDisk = drawDisk;
		}
	`;

const pointFragmentShader = `
		precision mediump float;
		varying vec3 fragColor;
		varying float fragDrawDisk;

		void main() {
			if (fragDrawDisk == 1.0) {
				float rx = 0.5 - gl_PointCoord.x;
				float ry = 0.5 - gl_PointCoord.y;
				float r2 = rx * rx + ry * ry;
				if (r2 > 0.25)
					discard;
			}
			gl_FragColor = vec4(fragColor, 1.0);
		}
	`;

const meshVertexShader = `
	attribute vec2 attrPosition;
	attribute vec3 attrColor;

	uniform vec2 domainSize;

	varying vec3 fragColor;

	void main() {
		vec4 screenTransform = vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
		gl_Position = vec4(attrPosition * screenTransform.xy + screenTransform.zw, 0.0, 1.0);
		fragColor = attrColor;
	}
`;


const meshFragmentShader = `
		precision mediump float;
		varying vec3 fragColor;

		void main() {
			gl_FragColor = vec4(fragColor, 1.0);
		}
	`;

	const fishVertexShader = `
	attribute vec2 attrPosition;
	attribute vec2 attrUV;

	uniform vec2 domainSize;
	uniform vec2 fishPos;
	uniform vec2 fishSize;
	uniform float flipX;

	varying vec2 fragUV;

	void main() {
		vec2 v = fishPos + attrPosition * fishSize;
		vec4 screenTransform = vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
		gl_Position = vec4(v * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

		// Flip horizontally if needed
		vec2 uv = attrUV;
		if (flipX == 1.0) {
			uv.x = 1.0 - uv.x;
		}
		fragUV = uv;
	}
`;

const fishFragmentShader = `
	precision mediump float;

	uniform sampler2D fishTexture;
	varying vec2 fragUV;

	void main() {
		vec4 texColor = texture2D(fishTexture, fragUV);
		if (texColor.a < 0.1) discard; // for transparent parts
		gl_FragColor = texColor;
	}
`;
