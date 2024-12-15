const overlay = document.getElementById("overlay");
const closeAddModal = document.getElementById("closeAddModal");
const closeEditModal = document.getElementById("closeEditModal");

//Add Sector
const addSectorBtn = document.getElementById("addSectorBtn");
const addSectorModal = document.getElementById("addSectorModal");

addSectorBtn.addEventListener("click", () => {
  addSectorModal.style.display = "block";
  overlay.style.display = "block";
});

const closeAddModalFunction = () => {
  addSectorModal.style.display = "none";
  overlay.style.display = "none";
};

closeAddModal.addEventListener("click", closeAddModalFunction);
overlay.addEventListener("click", closeAddModalFunction);

//Edit Sector
const editSectorModal = document.getElementById("editSectorModal");

function editSector(sectorId) {
  fetch(`/user/get-sector/${sectorId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById("sector_name").value = data.sector.sector_name;
        document.getElementById("description").value = data.sector.description;

        const form = document.getElementById("editSectorForm");
        form.setAttribute("action", `/edit-sector/${sectorId}`);

        editSectorModal.style.display = "block";
        overlay.style.display = "block";
      } else {
        alert('Failed to fetch sector data');
      }
    })
    .catch(err => {
      console.error('Error fetching sector data:', err);
      alert('Error fetching sector data');
    });
}

const closeEditModalFunction = () => {
  editSectorModal.style.display = "none";
  overlay.style.display = "none";
};

closeEditModal.addEventListener("click", closeEditModalFunction);
overlay.addEventListener("click", closeEditModalFunction);

setTimeout(function() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(function(message) {
      message.style.display = 'none';
    });
}, 5000);

function deleteSector(sector_Id) {
  if (sector_Id && confirm('Are you sure you want to delete this sector?')) {
    const deleteBtn = document.querySelector(`button[data-sector-id="${sector_Id}"]`);
    deleteBtn.innerHTML = "Deleting...";
    fetch(`/user/delete-sector/${sector_Id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Sector deleted successfully');
          location.reload();
        } else {
          deleteBtn.innerHTML = "Delete";
          alert('Failed to delete sector: ' + (data.message || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error during fetch:', error);
        deleteBtn.innerHTML = "Delete";
        alert('An error occurred while deleting the user. Please try again.');
      });
  }
}

function viewSector(sectorId) {
  if (sectorId) {
    window.location.href = `/user/user-viewsector/${sectorId}`;
  } else {
    alert('Invalid sector ID');
  }
}
