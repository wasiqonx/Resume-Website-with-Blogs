document.addEventListener("DOMContentLoaded", function() {
    const cursorLight = document.querySelector('.cursor-light');
    const backgroundLight = document.querySelector('.background-light');

    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2 * 50; // Adjust 50 to control movement range
        const y = (e.clientY / window.innerHeight - 0.5) * 2 * 50; // Adjust 50 to control movement range
        cursorLight.style.left = `${e.clientX}px`;
        cursorLight.style.top = `${e.clientY}px`;
        backgroundLight.style.transform = `translate(${x}px, ${y}px)`;
    });
});