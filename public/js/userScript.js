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
}, 5000);

function deleteSector(sector_Id) {
  if (sector_Id && confirm('Are you sure you want to delete this sector?')) {
    fetch(`/user/delete-sector/${sector_Id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          alert('Sector deleted successfully');
          location.reload();
        } else {
          alert('Failed to delete sector: ' + (data.message || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error during fetch:', error);
        alert('An error occurred while deleting the user. Please try again.');
      });
  }
}