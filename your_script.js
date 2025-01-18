async function startGeneration() {
    const inputImage = document.getElementById('inputImage').files[0];
    const promptText = document.getElementById('prompt').value;

    if (!inputImage || !promptText) {
        alert('画像とプロンプトを入力してください。');
        return;
    }

    try {
        await generateImageFromImage(inputImage, promptText);
    } catch (error) {
        console.error('エラー:', error);
        alert('画像生成に失敗しました。');
    }
}

async function generateImageFromImage(inputImage, promptText, strength = 0.75) {
    const API_KEY = 'your_api_key';
    const API_URL = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';

    const formData = new FormData();
    formData.append('image', inputImage);
    formData.append('prompt', promptText);
    formData.append('strength', strength);
    formData.append('model', 'sd3.5-large')
    formData.append('mode', 'image-to-image');

    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'image/*'
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: formData
    });

    if (!response.ok) {
        throw new Error('APIエラー: ' + response.statusText);
    }

    const resultBlob = await response.blob();
    const resultImageUrl = URL.createObjectURL(resultBlob);
    displayGeneratedImage(resultImageUrl);
}

function displayGeneratedImage(imageUrl) {
    const imageContainer = document.getElementById('generatedImageContainer');
    const imgElement = document.createElement('img');
    imgElement.src = imageUrl;
    imageContainer.innerHTML = '';
    imageContainer.appendChild(imgElement);
}
