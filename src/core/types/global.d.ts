interface Navigator {
    gpu?: GPU;
}

interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
    powerPreference?: GPUPowerPreference;
    forceFallbackAdapter?: boolean;
}

interface GPUAdapter {
    readonly features: GPUSupportedFeatures;
    readonly limits: GPUSupportedLimits;
    readonly isFallbackAdapter: boolean;

    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
    requestAdapterInfo(): Promise<GPUAdapterInfo>;
}

type GPUPowerPreference = 'low-power' | 'high-performance';