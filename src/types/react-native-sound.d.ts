declare module 'react-native-sound' {
  export default class Sound {
    static MAIN_BUNDLE: string;
    static DOCUMENT: string;
    static LIBRARY: string;
    static CACHES: string;
    
    static setCategory(category: string, mixWithOthers?: boolean): void;
    
    constructor(
      filename: string,
      basePath: string,
      onError?: (error: Error | null) => void
    );
    
    play(onEnd?: (success: boolean) => void): void;
    pause(callback?: () => void): void;
    stop(callback?: () => void): void;
    release(): void;
    setVolume(value: number): void;
    setNumberOfLoops(value: number): void;
    getCurrentTime(callback: (seconds: number, isPlaying: boolean) => void): void;
    setCurrentTime(value: number): void;
    getDuration(): number;
    isLoaded(): boolean;
    isPlaying(): boolean;
  }
}
