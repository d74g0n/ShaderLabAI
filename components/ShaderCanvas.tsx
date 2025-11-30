import React, { useEffect, useRef } from 'react';

interface ShaderCanvasProps {
  bufferCode: string;
  postCode: string;
  isPlaying: boolean;
  channels: string[]; // Array of texture URLs for iChannels
  onError: (error: string | null) => void;
  onTimeUpdate: (time: number) => void;
}

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_HEADER_COMMON = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
`;

// Post shader gets the Buffer uniform
const FRAGMENT_HEADER_POST = `
${FRAGMENT_HEADER_COMMON}
uniform sampler2D Buffer;
`;

const FRAGMENT_FOOTER = `
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

const ShaderCanvas: React.FC<ShaderCanvasProps> = ({ 
  bufferCode, 
  postCode,
  isPlaying, 
  channels, 
  onError, 
  onTimeUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  
  // Programs
  const bufferProgramRef = useRef<WebGLProgram | null>(null);
  const postProgramRef = useRef<WebGLProgram | null>(null);
  
  // FBO for Buffer pass
  const fboRef = useRef<WebGLFramebuffer | null>(null);
  const fboTextureRef = useRef<WebGLTexture | null>(null);

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

  // Initialize WebGL & FBO
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      onError("WebGL not supported");
      return;
    }
    glRef.current = gl;

    // Create FBO and Texture
    const fbo = gl.createFramebuffer();
    const texture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    fboRef.current = fbo;
    fboTextureRef.current = texture;

    // Initial Resize & Buffer Setup
    const resizeObserver = new ResizeObserver(() => {
        const width = canvas.clientWidth * window.devicePixelRatio;
        const height = canvas.clientHeight * window.devicePixelRatio;
        
        canvas.width = width;
        canvas.height = height;
        
        // Resize FBO texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.viewport(0, 0, width, height);
    });
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compile Shaders
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;

    const compile = (source: string, isPost: boolean): WebGLProgram | string => {
       // Cleanup old shader if needed? (Optimized out for brevity)
       const vertShader = gl.createShader(gl.VERTEX_SHADER);
       const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
       if (!vertShader || !fragShader) return "Failed to create shaders";

       gl.shaderSource(vertShader, VERTEX_SHADER);
       gl.compileShader(vertShader);

       if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
         return "Vertex Shader Error: " + gl.getShaderInfoLog(vertShader);
       }

       const header = isPost ? FRAGMENT_HEADER_POST : FRAGMENT_HEADER_COMMON;
       const fullFragSource = `${header}\n${source}\n${FRAGMENT_FOOTER}`;
       gl.shaderSource(fragShader, fullFragSource);
       gl.compileShader(fragShader);

       if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
         return gl.getShaderInfoLog(fragShader) || "Unknown compile error";
       }

       const program = gl.createProgram();
       if (!program) return "Failed to create program";

       gl.attachShader(program, vertShader);
       gl.attachShader(program, fragShader);
       gl.linkProgram(program);

       if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
         return "Link Error: " + gl.getProgramInfoLog(program);
       }
       
       return program;
    };

    // Compile Buffer Shader
    const bufferRes = compile(bufferCode, false);
    if (typeof bufferRes === 'string') {
        onError(`[Buffer] ${bufferRes}`);
        return;
    }
    bufferProgramRef.current = bufferRes;

    // Compile Post Shader
    const postRes = compile(postCode, true);
    if (typeof postRes === 'string') {
        onError(`[Post Effects] ${postRes}`);
        return;
    }
    postProgramRef.current = postRes;

    // Setup Quad Buffer (Common for both)
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER, 
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), 
      gl.STATIC_DRAW
    );

    // Attribute Setup for Buffer Program
    const posLocBuffer = gl.getAttribLocation(bufferRes, "position");
    gl.enableVertexAttribArray(posLocBuffer);
    gl.vertexAttribPointer(posLocBuffer, 2, gl.FLOAT, false, 0, 0);

    // Attribute Setup for Post Program
    // Note: We need to bind this every frame if we switch programs unless we use VAOs
    // but typically attr 0 is position and it stays enabled. We'll re-bind pointer in render loop to be safe.

    onError(null);

    if (startTimeRef.current === 0) startTimeRef.current = performance.now();
  }, [bufferCode, postCode, onError]);

  // Handle Textures (iChannels)
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
    
    const setUniforms = (program: WebGLProgram, currentTime: number) => {
        const uTime = gl.getUniformLocation(program, "iTime");
        const uRes = gl.getUniformLocation(program, "iResolution");
        const uMouse = gl.getUniformLocation(program, "iMouse");
        
        gl.uniform1f(uTime, currentTime);
        gl.uniform3f(uRes, gl.canvas.width, gl.canvas.height, window.devicePixelRatio);
        gl.uniform4f(uMouse, mouseRef.current.x, mouseRef.current.y, mouseRef.current.z, mouseRef.current.w);
        
        // Bind iChannels 0-3
        [0, 1, 2, 3].forEach(i => {
            const uChan = gl.getUniformLocation(program, `iChannel${i}`);
            if (uChan) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, texturesRef.current[i]);
                gl.uniform1i(uChan, i);
            }
        });
    };

    const render = (time: number) => {
        if (!gl || !bufferProgramRef.current || !postProgramRef.current || !fboRef.current) return;
        
        if (isPlaying) {
             const currentTime = (time - startTimeRef.current) / 1000;
             onTimeUpdate(currentTime);
             
             // --- PASS 1: Render Buffer to FBO ---
             gl.bindFramebuffer(gl.FRAMEBUFFER, fboRef.current);
             gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
             gl.useProgram(bufferProgramRef.current);
             
             // Re-bind attributes for safety
             const posLocBuffer = gl.getAttribLocation(bufferProgramRef.current, "position");
             gl.vertexAttribPointer(posLocBuffer, 2, gl.FLOAT, false, 0, 0);
             gl.enableVertexAttribArray(posLocBuffer);

             setUniforms(bufferProgramRef.current, currentTime);
             gl.drawArrays(gl.TRIANGLES, 0, 6);

             // --- PASS 2: Render Post to Screen ---
             gl.bindFramebuffer(gl.FRAMEBUFFER, null);
             gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
             gl.useProgram(postProgramRef.current);

             const posLocPost = gl.getAttribLocation(postProgramRef.current, "position");
             gl.vertexAttribPointer(posLocPost, 2, gl.FLOAT, false, 0, 0);
             gl.enableVertexAttribArray(posLocPost);

             setUniforms(postProgramRef.current, currentTime);

             // Bind Buffer Texture to Unit 4 and set uniform "Buffer"
             const uBuffer = gl.getUniformLocation(postProgramRef.current, "Buffer");
             if (uBuffer) {
                 gl.activeTexture(gl.TEXTURE4);
                 gl.bindTexture(gl.TEXTURE_2D, fboTextureRef.current);
                 gl.uniform1i(uBuffer, 4);
             }

             gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        
        requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, onTimeUpdate]);

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
