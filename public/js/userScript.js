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
  console.log('test');
  fetch(`/user/get-sector/${sectorId}`)
    .then((res) =>{
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log('Test1 Fetched sector data:', data);
      if (data.success) {
        document.getElementById("edit_sector_name").value = data.sector.sector_name;
        document.getElementById("edit_description").value = data.sector.description;

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

function deleteSector(sectorId) {
  if (sectorId && confirm('Are you sure you want to delete this sector?')) {
    fetch(`/user/delete-sector/${sectorId}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('Sector deleted successfully');
        location.reload();
      } else {
        alert('Failed to delete sector');
      }
    })
    .catch(err => {
      console.error('Error deleting sector:', err);
      alert('Error deleting sector');
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

function addBatch(sectorId) {
  window.location.href = `/user/user-addbatch/${sectorId}`;
}
