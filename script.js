import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';

document.addEventListener('DOMContentLoaded', () => {
// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const editorPanel = document.getElementById('editorPanel');
const originalPreview = document.getElementById('originalPreview');
const resultCanvas = document.getElementById('resultCanvas');
const colorPicker = document.getElementById('colorPicker');
const hexInput = document.getElementById('hexInput');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const bgRemovalToggle = document.getElementById('bgRemovalToggle');
const loadingOverlay = document.getElementById('loadingOverlay');

// State
let currentImage = null; // The image source used for generation (could be original or processed)
let originalFileSource = null; // Keeps track of the uploaded file source
let isProcessing = false;

// --- Upload Handling ---

// Trigger file input on click
uploadZone.addEventListener('click', () => {
if (isProcessing) return;
fileInput.click();
});

// Handle File Selection
fileInput.addEventListener('change', (e) => {
if (e.target.files && e.target.files[0]) {
handleImage(e.target.files[0]);
}
});

// Valid drag events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
uploadZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
e.preventDefault();
e.stopPropagation();
}

// Drag styling
['dragenter', 'dragover'].forEach(eventName => {
uploadZone.addEventListener(eventName, () => {
if (!isProcessing) uploadZone.classList.add('dragging');
}, false);
});

['dragleave', 'drop'].forEach(eventName => {
uploadZone.addEventListener(eventName, () => {
uploadZone.classList.remove('dragging');
}, false);
});

// Drop handler
uploadZone.addEventListener('drop', (e) => {
if (isProcessing) return;
const dt = e.dataTransfer;
const files = dt.files;
if (files && files[0]) {
handleImage(files[0]);
}
});

function handleImage(file) {
// Basic type validation
if (!file.type.match('image.*')) {
alert('Please upload an image file.');
return;
}

// Store original source to allow re-processing if they toggle the checkbox
const reader = new FileReader();
reader.onload = (e) => {
originalFileSource = e.target.result;
processImagePipeline();
};
reader.readAsDataURL(file);
}

async function processImagePipeline() {
if (!originalFileSource) return;

// 1. Determine if we need to remove background
const shouldRemoveBg = bgRemovalToggle.checked;

if (shouldRemoveBg) {
try {
showLoading(true);

// Using the imported function directly
console.log("Starting background removal...");
const blob = await removeBackground(originalFileSource, {
progress: (key, current, total) => {
console.log(`Downloading ${key}: ${current} of ${total}`);
}
});
console.log("Background removal complete.");

const url = URL.createObjectURL(blob);

loadImage(url);
showLoading(false);
} catch (error) {
console.error("Background removal error:", error);
alert('Error removing background: ' + error.message);
showLoading(false);
// Fallback to original
loadImage(originalFileSource);
}
} else {
loadImage(originalFileSource);
}
}

function loadImage(src) {
const img = new Image();
img.onload = () => {
currentImage = img;

// Switch UI
uploadZone.classList.add('hidden');
editorPanel.classList.remove('hidden');

// Update preview
originalPreview.src = src;

// Configure canvas
resultCanvas.width = img.width;
resultCanvas.height = img.height;

generateSilhouette();
};
img.src = src;
}

function showLoading(show) {
isProcessing = show;
if (show) {
loadingOverlay.classList.remove('hidden');
} else {
loadingOverlay.classList.add('hidden');
}
}


// --- Processing Logic ---

function hexToRgb(hex) {
const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
return result ? {
r: parseInt(result[1], 16),
g: parseInt(result[2], 16),
b: parseInt(result[3], 16)
} : { r: 0, g: 0, b: 0 };
}

function generateSilhouette() {
if (!currentImage) return;

const ctx = resultCanvas.getContext('2d');
const width = resultCanvas.width;
const height = resultCanvas.height;

// Clear canvas
ctx.clearRect(0, 0, width, height);

// Draw current image 
ctx.drawImage(currentImage, 0, 0);

// Get Pixel Data
const imageData = ctx.getImageData(0, 0, width, height);
const data = imageData.data;

const targetColor = hexToRgb(colorPicker.value);

// Modify Pixels
for (let i = 0; i < data.length; i += 4) {
// Apply silhouette logic
if (data[i + 3] > 0) {
data[i] = targetColor.r;
data[i + 1] = targetColor.g;
data[i + 2] = targetColor.b;
// preserve alpha
}
}

// Put modified data back
ctx.putImageData(imageData, 0, 0);
}


// --- Controls Events ---

colorPicker.addEventListener('input', (e) => {
hexInput.value = e.target.value.toUpperCase();
generateSilhouette();
});

hexInput.addEventListener('change', (e) => {
let val = e.target.value;
if (!val.startsWith('#')) {
val = '#' + val;
}
if (/^#[0-9A-F]{6}$/i.test(val)) {
colorPicker.value = val;
hexInput.value = val.toUpperCase();
generateSilhouette();
} else {
hexInput.value = colorPicker.value.toUpperCase();
}
});

bgRemovalToggle.addEventListener('change', () => {
if (originalFileSource) {
processImagePipeline();
}
});

resetBtn.addEventListener('click', () => {
currentImage = null;
originalFileSource = null;
fileInput.value = '';
editorPanel.classList.add('hidden');
uploadZone.classList.remove('hidden');
originalPreview.src = '';
});

downloadBtn.addEventListener('click', () => {
if (!currentImage) return;

const link = document.createElement('a');
link.download = 'silhouette.png';
link.href = resultCanvas.toDataURL('image/png');
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
});

});
