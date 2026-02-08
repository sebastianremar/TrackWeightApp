// Tab switching
const tabs = document.querySelectorAll('.tab');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');

tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
            t.classList.remove('active');
        });
        tab.classList.add('active');

        if (tab.dataset.tab === 'signin') {
            signinForm.classList.add('active');
            signupForm.classList.remove('active');
        } else {
            signupForm.classList.add('active');
            signinForm.classList.remove('active');
        }
    });
});

// Sign In
signinForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const errorEl = document.getElementById('signin-error');
    errorEl.style.display = 'none';

    try {
        const data = await API.signin(email, password);
        localStorage.setItem('userName', data.user.name);
        window.showDashboard(data.user.name);
    } catch (err) {
        errorEl.textContent = err.message || 'Could not connect to server';
        errorEl.style.display = 'block';
    }
});

// Sign Up
signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');
    errorEl.style.display = 'none';

    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const data = await API.signup(name, email, password);
        localStorage.setItem('userName', data.user.name);
        window.showDashboard(data.user.name);
    } catch (err) {
        errorEl.textContent = err.message || 'Could not connect to server';
        errorEl.style.display = 'block';
    }
});
