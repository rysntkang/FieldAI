function searchUser() {
  const searchInput = document.getElementById('search').value.toLowerCase();
  const rows = document.querySelectorAll('table tbody tr');

  rows.forEach(row => {
    const usernameCell = row.querySelector('td:nth-child(2)');
    if (usernameCell) {
      const username = usernameCell.innerText.toLowerCase();
      if (username.includes(searchInput)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
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
