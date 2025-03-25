document.addEventListener('DOMContentLoaded', async () => {
    const pendingContainer = document.getElementById('pending-images-container');
    const approvedContainer = document.getElementById('approved-images-container');

    // Fetch pending images
    const response = await fetch('/api/pending-images');
    const images = await response.json();

    images.forEach((image) => {
        const imgElement = document.createElement('img');
        imgElement.src = image.previewUrl;
        imgElement.alt = 'Pending Image';
        imgElement.style.maxWidth = '200px';

        const approveButton = document.createElement('button');
        approveButton.textContent = 'Approve';
        approveButton.addEventListener('click', async () => {
            await fetch(`/api/approve-image/${image.id}`, { method: 'POST' });

            // Simulate moving the image to a public directory
            const approvedImg = document.createElement('img');
            approvedImg.src = `/approved/${image.id}.jpg`;
            approvedImg.alt = 'Approved Image';
            approvedImg.style.maxWidth = '200px';

            approvedContainer.appendChild(approvedImg);
            imgElement.remove();
            approveButton.remove();
        });

        pendingContainer.appendChild(imgElement);
        pendingContainer.appendChild(approveButton);
    });
});
