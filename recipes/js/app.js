document.getElementById('image-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('image-upload');
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('image', file);

        // Simulate storing the image temporarily
        await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        alert('Image submitted for review!');
        fileInput.value = ''; // Clear the input
    }
});
