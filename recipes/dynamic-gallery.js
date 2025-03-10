document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Gallery Script
    function loadDynamicGallery() {
        const imageGallery = document.getElementById('dynamic-gallery');
        const images = [
            { src: 'img/gallery/20250304_145429.jpg', alt: 'AT&T Long Lines Horn', added: new Date(2025, 0, 1) },
            { src: 'img/gallery/20250304_145346.jpg', alt: 'Horn on its side', added: new Date(2025, 0, 2) },
            { src: 'img/gallery/20250309_172527.jpg', alt: 'Tower', added: new Date(2025, 0, 3) },
            { src: 'img/gallery/dhtspll1_far.jpg', alt: 'Another Tower from afar', added: new Date(2025, 0, 4) },
            { src: 'img/gallery/dhtspll_out.jpg', alt: 'An outbuilding at a tower site', added: new Date(2025, 0, 5) },
            { src: 'img/gallery/dhtspll_vents1.jpg', alt: 'large vents on the side of a building', added: new Date(2025, 0, 6) },
            { src: 'img/gallery/dhtspll_Reflector_HI.jpg', alt: 'Hi-res image of KS reflector antenna', added: new Date(2025, 0, 7) },
            { src: 'img/gallery/dhtspll2.jpg', alt: 'Other image of tower next to a building', added: new Date(2025, 0, 8) },
            { src: 'img/gallery/dhtspll3.jpg', alt: 'Another tower', added: new Date(2025, 0, 9) },
            { src: 'img/gallery/dhtspll_base.jpg', alt: 'Tower base', added: new Date(2025, 0, 10) },
            { src: 'img/ll1.jpg', alt: 'AT&T Long Lines Facility', added: new Date(2025, 0, 11) },
            { src: 'img/transistor.jpg', alt: 'Transistor at Bell Labs', added: new Date(2025, 0, 12) },
            { src: 'img/long-lines-facility.jpg', alt: 'Long Lines Facility', added: new Date(2025, 0, 13) }
        ];

        // Exclude map images and favicon
        const excludedImages = ['img/map1.jpg', 'img/map2.jpg', 'img/favicon.ico'];
        const filteredImages = images.filter(image => !excludedImages.includes(image.src));

        // Sort images by added date (most recent first)
        filteredImages.sort((a, b) => b.added - a.added);

        // Select the first 4 images
        const selectedImages = filteredImages.slice(0, 4);

        // Function to create an image element
        function createImageElement(image) {
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.alt;
            img.style.width = '45%';
            img.style.marginBottom = '15px';
            img.style.borderRadius = '8px';
            img.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
            img.style.transition = 'opacity 1s ease-in-out'; // Fade effect
            img.setAttribute('draggable', false); // Prevent dragging
            img.setAttribute('oncontextmenu', 'return false;'); // Disable right-click menu
            return img;
        }

        // Initial load of images
        selectedImages.forEach(image => {
            const imgElement = createImageElement(image);
            imageGallery.appendChild(imgElement);
        });

        // Function to fade out an image
        function fadeOut(element) {
            element.style.opacity = 0;
        }

        // Function to fade in an image
        function fadeIn(element) {
            element.style.opacity = 1;
        }

        // Rotate images every 5 seconds
        setInterval(() => {
            // Select a random image to fade out
            const images = imageGallery.getElementsByTagName('img');
            if (images.length > 0) {
                const randomIndex = Math.floor(Math.random() * images.length);
                const imageToFadeOut = images[randomIndex];

                fadeOut(imageToFadeOut);

                // After fade out, replace with a new image and fade in
                setTimeout(() => {
                    imageGallery.removeChild(imageToFadeOut);

                    // Select a new random image (that is not already displayed)
                    let newImage;
                    do {
                        newImage = images[Math.floor(Math.random() * images.length)];
                    } while (Array.from(images).includes(newImage));

                    if (newImage) {
                        const imgElement = createImageElement(newImage);
                        imageGallery.appendChild(imgElement);
                        fadeIn(imgElement);
                    }
                }, 1000); // Wait for the fade out
            }
        }, 5000);
    }

    loadDynamicGallery();
});
