// Auth Script Functions

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Show alert message
function showAlert(message, type) {
    const alertElement = document.getElementById('alertMessage');
    alertElement.textContent = message;
    alertElement.className = `alert ${type}`;
    alertElement.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}

// Check if user is already logged in
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token with server
        fetch('/api/auth/check', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                // Redirect to dashboard if on login/register page
                if (window.location.pathname === '/login.html' || window.location.pathname === '/register.html') {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // Remove invalid token
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        })
        .catch(error => {
            console.error('Auth check error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        });
    }
}

// Initialize auth check when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    
    // Add floating animation to shapes
    const shapes = document.querySelectorAll('.shape');
    shapes.forEach((shape, index) => {
        shape.style.animationDelay = `${index * 0.5}s`;
    });
});

// Social login handlers (placeholder)
document.addEventListener('DOMContentLoaded', function() {
    const googleBtn = document.querySelector('.google-btn');
    const githubBtn = document.querySelector('.github-btn');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            showAlert('Google login coming soon!', 'info');
        });
    }
    
    if (githubBtn) {
        githubBtn.addEventListener('click', function() {
            showAlert('GitHub login coming soon!', 'info');
        });
    }
});

// Form validation helpers
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
}

// Real-time form validation
document.addEventListener('DOMContentLoaded', function() {
    const emailInputs = document.querySelectorAll('input[type="email"]');
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const usernameInputs = document.querySelectorAll('input[name="username"]');
    
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '#e2e8f0';
            }
        });
    });
    
    passwordInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validatePassword(this.value)) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '#e2e8f0';
            }
        });
    });
    
    usernameInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validateUsername(this.value)) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '#e2e8f0';
            }
        });
    });
});