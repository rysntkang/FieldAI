function searchUser() {
  const searchTerm = document.getElementById('search').value;

  // Fetch filtered users via AJAX
  fetch(`/admin/home?search=${encodeURIComponent(searchTerm)}`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.text();
    })
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newTableBody = doc.querySelector('table tbody');
      const currentTableBody = document.querySelector('table tbody');
      currentTableBody.innerHTML = newTableBody.innerHTML;
    })
    .catch(error => console.error('Error during search:', error));
}

function addUser() {
  window.location.href = '/admin/add-user';
}

function viewUser(userId) {
  if (userId) {
    window.location.href = `/admin/admin-viewuser/${userId}`;
  } else {
    alert('Invalid user ID.');
  }
}

function deleteUser(userId) {
  if (userId && confirm('Are you sure you want to delete this user?')) {
    fetch(`/admin/delete-user/${userId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          alert('User deleted successfully');
          location.reload();
        } else {
          alert('Failed to delete user: ' + (data.message || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error during fetch:', error);
        alert('An error occurred while deleting the user. Please try again.');
      });
  }
}
