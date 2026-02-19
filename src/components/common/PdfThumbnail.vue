<template>
    <div class="pdf-thumbnail" :style="{ width: size + 'px', height: size + 'px' }">
        <div class="pdf-thumbnail-loading d-flex align-center justify-center" v-if="loading">
            <slot name="placeholder">
                <span class="pdf-thumbnail-loading-text">PDF</span>
            </slot>
        </div>
        <div class="pdf-thumbnail-error d-flex align-center justify-center" v-else-if="error">
            <slot name="error">
                <span class="pdf-thumbnail-error-text">PDF</span>
            </slot>
        </div>
        <img v-else :src="thumbnailDataUrl" alt="PDF thumbnail" class="pdf-thumbnail-image" />
        <div class="pdf-thumbnail-badge">PDF</div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = withDefaults(defineProps<{
    src?: string;
    size?: number;
}>(), {
    size: 160
});

const thumbnailDataUrl = ref<string>('');
const loading = ref<boolean>(true);
const error = ref<boolean>(false);

function toSameOriginUrl(url: string): string {
    try {
        const parsed = new URL(url, window.location.origin);

        if (parsed.origin !== window.location.origin) {
            return parsed.pathname + parsed.search;
        }
    } catch {
        // not a valid URL, return as-is
    }

    return url;
}

async function renderThumbnail(): Promise<void> {
    if (!props.src) {
        error.value = true;
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        error.value = false;

        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url
        ).href;

        const response = await fetch(toSameOriginUrl(props.src));
        const data = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const scale = props.size / Math.max(viewport.width, viewport.height);
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
            canvas: canvas,
            viewport: scaledViewport
        }).promise;

        thumbnailDataUrl.value = canvas.toDataURL('image/png');
        loading.value = false;
    } catch {
        error.value = true;
        loading.value = false;
    }
}

onMounted(() => {
    renderThumbnail();
});

watch(() => props.src, () => {
    renderThumbnail();
});
</script>

<style>
.pdf-thumbnail {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
}

.pdf-thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.pdf-thumbnail-loading,
.pdf-thumbnail-error {
    width: 100%;
    height: 100%;
    background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.pdf-thumbnail-loading-text,
.pdf-thumbnail-error-text {
    font-size: 1.25rem;
    font-weight: bold;
    color: rgba(var(--v-theme-on-surface), 0.4);
}

.pdf-thumbnail-badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background-color: rgba(220, 38, 38, 0.85);
    color: white;
    font-size: 10px;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
    line-height: 1.4;
}
</style>
