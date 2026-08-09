
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-matrix-rain',
  standalone: true,
  template: `
    <div class="relative w-full h-[400px] overflow-hidden rounded-xl border border-green-900/50 bg-black">
      <canvas #canvas class="block w-full h-full"></canvas>
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none"></div>
    </div>
  `,
  styles: []
})
export class MatrixRainComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private animationId: number = 0;
  
  // Matrix Logic
  private columns: number = 0;
  private drops: number[] = [];
  private textCanvas!: HTMLCanvasElement;
  private textCtx!: CanvasRenderingContext2D;
  private texture!: THREE.CanvasTexture;
  private planeMesh!: THREE.Mesh;
  
  private fontSize = 16;
  private chars = '0123456789ABCDEF';

  ngAfterViewInit() {
    this.initThree();
    this.animate();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThree() {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // 1. Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 1000);
    this.camera.position.z = 10;

    // 2. Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 1);

    // 3. Setup Matrix Logic (Canvas 2D acting as Texture)
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = width;
    this.textCanvas.height = height;
    this.textCtx = this.textCanvas.getContext('2d')!;
    
    // Initialize drops
    this.columns = Math.floor(width / this.fontSize);
    this.drops = [];
    for (let i = 0; i < this.columns; i++) {
      this.drops[i] = Math.random() * -100; // Start at random heights above
    }

    // Create Texture from Canvas
    this.texture = new THREE.CanvasTexture(this.textCanvas);
    this.texture.minFilter = THREE.LinearFilter;
    
    // Create Plane to display texture
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ 
      map: this.texture,
      transparent: true 
    });
    this.planeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.planeMesh);

    // Initial black fill
    this.textCtx.fillStyle = '#000';
    this.textCtx.fillRect(0, 0, width, height);
  }

  private drawMatrix() {
    if (!this.textCtx) return;

    // Fade effect
    this.textCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.textCtx.fillRect(0, 0, this.textCanvas.width, this.textCanvas.height);

    this.textCtx.fillStyle = '#0F0'; // Green text
    this.textCtx.font = this.fontSize + 'px monospace';

    for (let i = 0; i < this.drops.length; i++) {
      const text = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      const y = this.drops[i] * this.fontSize;

      this.textCtx.fillText(text, x, y);

      if (y > this.textCanvas.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }

      this.drops[i]++;
    }

    // Update Three.js texture
    this.texture.needsUpdate = true;
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.drawMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    const canvas = this.canvasRef.nativeElement;
    // Debounce or simple check
    if (!canvas) return;
    
    // In a real app we would resize buffers, here we keep it simple or reload
    // For simplicity in this prompt context, we just update renderer size to match container
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 400;
    
    this.renderer.setSize(width, height);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    
    // Re-init canvas 2d size
    this.textCanvas.width = width;
    this.textCanvas.height = height;
    this.columns = Math.floor(width / this.fontSize);
    this.drops = [];
    for (let i = 0; i < this.columns; i++) {
       this.drops[i] = Math.random() * -50;
    }
  }
}
