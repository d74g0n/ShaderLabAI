import React, { useEffect, useRef, useState } from 'react';

interface ShaderCanvasProps {
  fragCode: string;
  isPlaying: boolean;
  channels: string[]; // Array of texture URLs
  onError: (error: string | null) => void;
  onTimeUpdate: (time: number) => void;
  width?: string;
  height?: string;
}

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_HEADER = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

// Dummy placeholders if not used by user code to prevent link errors if we were strict, 
// but usually standard WebGL just ignores unused uniforms.
`;

const FRAGMENT_FOOTER = `
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

const ShaderCanvas: React.FC<ShaderCanvasProps> = ({ 
  fragCode, 
  isPlaying, 
  channels, 
  onError, 
  onTimeUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const mouseRef = useRef<{x: number, y: number, z: number, w: number}>({ x: 0, y: 0, z: 0, w: 0 });
  const texturesRef = useRef<(WebGLTexture | null)[]>([null, null, null, null]);

  // Load texture helper
  const loadTexture = (gl: WebGLRenderingContext, url: string, index: number) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Placeholder 1x1 pixel while loading
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!glRef.current) return;
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      
      // Mipmaps for power-of-2, otherwise clamp
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         gl.generateMipmap(gl.TEXTURE_2D);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    };
    // Use a placeholder if url is empty
    if (url) {
        image.src = url;
    }
    
    return texture;
  };

  const isPowerOf2 = (value: number) => (value & (value - 1)) === 0;

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      onError("WebGL not supported");
      return;
    }
    glRef.current = gl;

    // Initial Resize
    const resizeObserver = new ResizeObserver(() => {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compile Shader
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;

    // Cleanup old program
    // In a full app we'd delete shaders too, but for simplicity we rely on GC/context refresh usually
    // However, best practice:
    if (programRef.current) {
        gl.deleteProgram(programRef.current);
    }

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vertShader || !fragShader) return;

    gl.shaderSource(vertShader, VERTEX_SHADER);
    gl.compileShader(vertShader);

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      onError("Vertex Shader Error: " + gl.getShaderInfoLog(vertShader));
      return;
    }

    const fullFragSource = `${FRAGMENT_HEADER}\n${fragCode}\n${FRAGMENT_FOOTER}`;
    gl.shaderSource(fragShader, fullFragSource);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      onError(gl.getShaderInfoLog(fragShader));
      return;
    }

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onError("Link Error: " + gl.getProgramInfoLog(program));
      return;
    }

    // Success
    onError(null);
    programRef.current = program;

    // Buffer Setup
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER, 
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), 
      gl.STATIC_DRAW
    );

    // Attribute Setup
    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Initial start time reset on compile if needed, or keep running
    if (startTimeRef.current === 0) startTimeRef.current = performance.now();

  }, [fragCode, onError]);

  // Handle Textures
  useEffect(() => {
      const gl = glRef.current;
      if (!gl) return;

      channels.forEach((url, i) => {
          if (texturesRef.current[i]) {
              gl.deleteTexture(texturesRef.current[i]);
          }
          texturesRef.current[i] = loadTexture(gl, url, i);
      });
  }, [channels]);

  // Render Loop
  useEffect(() => {
    const gl = glRef.current;
    
    const render = (time: number) => {
        if (!gl || !programRef.current) return;
        
        if (isPlaying) {
             const currentTime = (time - startTimeRef.current) / 1000;
             onTimeUpdate(currentTime);
             
             gl.useProgram(programRef.current);
             
             // Uniforms
             const uTime = gl.getUniformLocation(programRef.current, "iTime");
             const uRes = gl.getUniformLocation(programRef.current, "iResolution");
             const uMouse = gl.getUniformLocation(programRef.current, "iMouse");
             
             gl.uniform1f(uTime, currentTime);
             gl.uniform3f(uRes, gl.canvas.width, gl.canvas.height, window.devicePixelRatio);
             gl.uniform4f(uMouse, mouseRef.current.x, mouseRef.current.y, mouseRef.current.z, mouseRef.current.w);
             
             // Bind Textures
             [0, 1, 2, 3].forEach(i => {
                 const uChan = gl.getUniformLocation(programRef.current, `iChannel${i}`);
                 if (uChan) {
                     gl.activeTexture(gl.TEXTURE0 + i);
                     gl.bindTexture(gl.TEXTURE_2D, texturesRef.current[i]);
                     gl.uniform1i(uChan, i);
                 }
             });

             gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        
        requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, onTimeUpdate]); // Deps: isPlaying toggles the logic inside, but we keep loop alive to resume instantly

  // Mouse Handlers
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * window.devicePixelRatio;
      const y = (canvasRef.current.clientHeight - (e.clientY - rect.top)) * window.devicePixelRatio; // Flip Y
      
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      
      if (mouseRef.current.z > 0) { // Dragging
          mouseRef.current.z = x;
          mouseRef.current.w = y;
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      handleMouseMove(e);
      mouseRef.current.z = mouseRef.current.x;
      mouseRef.current.w = mouseRef.current.y;
  };

  const handleMouseUp = () => {
      mouseRef.current.z = -Math.abs(mouseRef.current.z);
      mouseRef.current.w = -Math.abs(mouseRef.current.w);
  };

  return (
    <canvas 
        ref={canvasRef} 
        className="w-full h-full block bg-black"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    />
  );
};

export default ShaderCanvas;
