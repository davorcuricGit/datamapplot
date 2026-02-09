class AnimationRecorder {
  constructor(datamap) {
    this.datamap = datamap;
    this.keyframes = [];
    this.isRecording = false;
  }

  addKeyframe(frameNumber = null) {
    // Poll the deck.gl instance directly for current camera position
    const viewport = this.datamap.deckgl.getViewports()[0];
    
    const currentView = {
      longitude: viewport.longitude,
      latitude: viewport.latitude,
      zoom: viewport.zoom
    };
    
    // Rest stays the same...
    const frame = frameNumber !== null ? frameNumber : 
                  (this.keyframes.length > 0 ? this.keyframes[this.keyframes.length - 1].frame + 100 : 0);
    
    const keyframe = {
      id: this.keyframes.length,
      frame: frame,
      viewState: currentView
    };
    
    this.keyframes.push(keyframe);
    console.log('Keyframe added:', keyframe);
    return keyframe;
  }

  removeKeyframe(id) {
    this.keyframes = this.keyframes.filter(kf => kf.id !== id);
  }

  async renderAnimation(fps = 30, onProgress = null) {
    if (this.keyframes.length < 2) {
      alert('Need at least 2 keyframes to render animation');
      return;
    }

    // Sort keyframes by frame number
    const sorted = [...this.keyframes].sort((a, b) => a.frame - b.frame);
    
    const frames = [];
    
    // Generate all frames between keyframes
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i];
      const end = sorted[i + 1];
      const duration = end.frame - start.frame;
      
      for (let f = 0; f <= duration; f++) {
        const t = f / duration; // 0 to 1
        
        // Linear interpolation
        const viewState = {
          longitude: this.lerp(start.viewState.longitude, end.viewState.longitude, t),
          latitude: this.lerp(start.viewState.latitude, end.viewState.latitude, t),
          zoom: this.lerp(start.viewState.zoom, end.viewState.zoom, t),
        };
        
        frames.push({
          frameNumber: start.frame + f,
          viewState: viewState
        });
      }
    }
    
    console.log(`Rendering ${frames.length} frames...`);
    
    // Render each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      // Update view
      await this.setViewAndWait(frame.viewState);
      
      // Capture frame
      const blob = await this.captureFrame();
      
      // Download
      this.downloadBlob(blob, `frame_${String(frame.frameNumber).padStart(4, '0')}.png`);
      
      // Progress callback
      if (onProgress) {
        onProgress(i + 1, frames.length);
      }
      
      // Small delay to prevent browser lockup
      await this.sleep(50);
    }
    
    console.log('Animation rendering complete!');
  }

  async setViewAndWait(viewState) {
    return new Promise((resolve) => {
      this.datamap.deckgl.setProps({
        viewState: viewState,
        onAfterRender: () => {
          resolve();
        }
      });
    });
  }

  async captureFrame() {
    const canvas = this.datamap.deckgl.canvas;
    return new Promise((resolve) => {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getKeyframesList() {
    return [...this.keyframes].sort((a, b) => a.frame - b.frame);
  }
}