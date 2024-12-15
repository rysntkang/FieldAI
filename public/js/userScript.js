const addSectorBtn = document.getElementById("addSectorBtn");
const addSectorModal = document.getElementById("addSectorModal");
const overlay = document.getElementById("overlay");
const closeModal = document.getElementById("closeModal");

addSectorBtn.addEventListener("click", () => {
  addSectorModal.style.display = "block";
  overlay.style.display = "block";
});

const closeModalFunction = () => {
  addSectorModal.style.display = "none";
  overlay.style.display = "none";
};

closeModal.addEventListener("click", closeModalFunction);

overlay.addEventListener("click", closeModalFunction);

setTimeout(function() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(function(message) {
      message.style.display = 'none';
    });
  }, 5000); // Hide the flash messages after 5 seconds