// Dashboard Script

let currentUser = null;
let allCourses = [];
let userCourses = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeDashboard();
    setupEventListeners();
});

// Check if user is authenticated
function checkAuthentication() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(user);
        updateUserInfo();
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
    }
}

// Update user information in the UI
function updateUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('userName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('userRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
}

// Initialize dashboard data
async function initializeDashboard() {
    try {
        await Promise.all([
            loadUserProfile(),
            loadCourses(),
            seedCoursesIfEmpty()
        ]);
        
        updateDashboardStats();
        loadRecentCourses();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            populateProfileForm(userData);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Populate profile form with user data
function populateProfileForm(userData) {
    document.getElementById('profileFirstName').value = userData.firstName || '';
    document.getElementById('profileLastName').value = userData.lastName || '';
    document.getElementById('profileBio').value = userData.profile?.bio || '';
    document.getElementById('profilePhone').value = userData.profile?.phone || '';
    document.getElementById('profileAddress').value = userData.profile?.address || '';
    
    if (userData.profile?.dateOfBirth) {
        const date = new Date(userData.profile.dateOfBirth);
        document.getElementById('profileDateOfBirth').value = date.toISOString().split('T')[0];
    }
}

// Load courses
async function loadCourses() {
    try {
        const response = await fetch('/api/courses');
        if (response.ok) {
            allCourses = await response.json();
            displayCourses(allCourses);
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// Seed courses if database is empty
async function seedCoursesIfEmpty() {
    if (allCourses.length === 0) {
        try {
            const response = await fetch('/api/seed-courses', {
                method: 'POST'
            });
            
            if (response.ok) {
                await loadCourses();
            }
        } catch (error) {
            console.error('Error seeding courses:', error);
        }
    }
}

// Display courses in the browse section
function displayCourses(courses) {
    const coursesGrid = document.getElementById('coursesGrid');
    
    if (courses.length === 0) {
        coursesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <h3>No courses available</h3>
                <p>Check back later for new courses</p>
            </div>
        `;
        return;
    }
    
    coursesGrid.innerHTML = courses.map(course => `
        <div class="course-card" data-course-id="${course._id}">
            <img src="${course.image}" alt="${course.title}" class="course-image" onerror="this.src='https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1'">
            <div class="course-content">
                <span class="course-category">${course.category}</span>
                <h3 class="course-title">${course.title}</h3>
                <p class="course-description">${course.description}</p>
                <div class="course-meta">
                    <span class="course-instructor">By ${course.instructor}</span>
                    <div class="course-rating">
                        <span class="stars">${generateStars(course.rating)}</span>
                        <span class="rating-text">(${course.rating})</span>
                    </div>
                </div>
                <div class="course-footer">
                    <span class="course-price">$${course.price}</span>
                    <button class="enroll-btn" onclick="enrollInCourse('${course._id}')">
                        Enroll Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Generate star rating HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Enroll in course
async function enrollInCourse(courseId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Successfully enrolled in course!', 'success');
            updateDashboardStats();
            loadRecentCourses();
        } else {
            showNotification(data.message || 'Enrollment failed', 'error');
        }
    } catch (error) {
        console.error('Enrollment error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    // This would typically come from the server
    // For now, we'll use mock data
    document.getElementById('enrolledCoursesCount').textContent = userCourses.length || '0';
}

// Load recent courses for dashboard
function loadRecentCourses() {
    const recentCoursesList = document.getElementById('recentCoursesList');
    
    if (userCourses.length === 0) {
        recentCoursesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No enrolled courses</h3>
                <p>Browse and enroll in courses to start learning</p>
            </div>
        `;
        return;
    }
    
    // Show first 3 courses
    const recentCourses = userCourses.slice(0, 3);
    recentCoursesList.innerHTML = recentCourses.map(course => `
        <div class="course-item">
            <img src="${course.image}" alt="${course.title}" class="course-thumbnail" onerror="this.src='https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&dpr=1'">
            <div class="course-info">
                <h4>${course.title}</h4>
                <p>Continue learning</p>
                <div class="course-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.random() * 100}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
            updateActiveNav(this);
        });
    });
    
    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
    
    // Course filters
    const categoryFilter = document.getElementById('categoryFilter');
    const levelFilter = document.getElementById('levelFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterCourses);
    }
    
    if (levelFilter) {
        levelFilter.addEventListener('change', filterCourses);
    }
    
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    }
}

// Update active navigation
function updateActiveNav(activeLink) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    activeLink.parentElement.classList.add('active');
}

// Filter courses
function filterCourses() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const levelFilter = document.getElementById('levelFilter').value;
    
    let filteredCourses = allCourses;
    
    if (categoryFilter) {
        filteredCourses = filteredCourses.filter(course => course.category === categoryFilter);
    }
    
    if (levelFilter) {
        filteredCourses = filteredCourses.filter(course => course.level === levelFilter);
    }
    
    displayCourses(filteredCourses);
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm === '') {
        displayCourses(allCourses);
        return;
    }
    
    const filteredCourses = allCourses.filter(course => 
        course.title.toLowerCase().includes(searchTerm) ||
        course.description.toLowerCase().includes(searchTerm) ||
        course.category.toLowerCase().includes(searchTerm) ||
        course.instructor.toLowerCase().includes(searchTerm)
    );
    
    displayCourses(filteredCourses);
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        bio: formData.get('bio'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        dateOfBirth: formData.get('dateOfBirth')
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Profile updated successfully!', 'success');
            
            // Update current user data
            currentUser.firstName = data.user.firstName;
            currentUser.lastName = data.user.lastName;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserInfo();
        } else {
            showNotification(data.message || 'Profile update failed', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Show notification
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Logout function
function logout() {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Call logout API
    fetch('/api/logout', {
        method: 'POST'
    }).finally(() => {
        // Redirect to login page
        window.location.href = 'login.html';
    });
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    }
    
    .notification-close:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(notificationStyles);