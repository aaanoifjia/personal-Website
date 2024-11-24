// File: three-loaders.d.ts
declare module 'three-loaders' {
  export class GLTFLoader {
    constructor();
    load(
      url: string,
      onLoad: (gltf: any) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }

  export class DRACOLoader {
    constructor();
    setDecoderPath(path: string): void;
    setDecoderConfig(config: object): void;
  }
}
