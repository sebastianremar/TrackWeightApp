var Settings = {
    profile: null,

    load: async function() {
        var container = document.getElementById('screen-settings');
        container.innerHTML = '';

        try {
            var result = await API.getProfile();
            this.profile = result;
        } catch (err) {
            Toast.error(err.message);
            return;
        }

        this.render();
    },

    render: function() {
        var container = document.getElementById('screen-settings');
        container.innerHTML = '';

        // Profile card
        var profileCard = document.createElement('section');
        profileCard.className = 'card';

        var profileTitle = document.createElement('h2');
        profileTitle.textContent = 'Profile';
        profileCard.appendChild(profileTitle);

        var group = document.createElement('div');
        group.className = 'settings-group';

        // Name row
        var nameRow = document.createElement('div');
        nameRow.className = 'settings-row';
        var nameLabel = document.createElement('span');
        nameLabel.className = 'settings-label';
        nameLabel.textContent = 'Display Name';
        var nameValue = document.createElement('span');
        nameValue.className = 'settings-value';
        nameValue.textContent = this.profile.name;
        nameValue.style.cursor = 'pointer';
        nameValue.addEventListener('click', function() {
            Settings.editName();
        });
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameValue);
        group.appendChild(nameRow);

        // Email row
        var emailRow = document.createElement('div');
        emailRow.className = 'settings-row';
        var emailLabel = document.createElement('span');
        emailLabel.className = 'settings-label';
        emailLabel.textContent = 'Email';
        var emailValue = document.createElement('span');
        emailValue.className = 'settings-value';
        emailValue.textContent = this.profile.email;
        emailRow.appendChild(emailLabel);
        emailRow.appendChild(emailValue);
        group.appendChild(emailRow);

        profileCard.appendChild(group);
        container.appendChild(profileCard);

        // Privacy card
        var privacyCard = document.createElement('section');
        privacyCard.className = 'card';

        var privacyTitle = document.createElement('h2');
        privacyTitle.textContent = 'Privacy';
        privacyCard.appendChild(privacyTitle);

        var privacyGroup = document.createElement('div');
        privacyGroup.className = 'settings-group';

        var shareRow = document.createElement('div');
        shareRow.className = 'settings-row';
        var shareLabel = document.createElement('span');
        shareLabel.className = 'settings-label';
        shareLabel.textContent = 'Share weight with friends';
        var toggle = document.createElement('label');
        toggle.className = 'toggle';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.profile.shareWeight || false;
        checkbox.addEventListener('change', function() {
            Settings.updateShareWeight(checkbox.checked);
        });
        var slider = document.createElement('div');
        slider.className = 'toggle-slider';
        toggle.appendChild(checkbox);
        toggle.appendChild(slider);
        shareRow.appendChild(shareLabel);
        shareRow.appendChild(toggle);
        privacyGroup.appendChild(shareRow);

        privacyCard.appendChild(privacyGroup);
        container.appendChild(privacyCard);

        // Account card
        var accountCard = document.createElement('section');
        accountCard.className = 'card';

        var accountTitle = document.createElement('h2');
        accountTitle.textContent = 'Account';
        accountCard.appendChild(accountTitle);

        var memberRow = document.createElement('div');
        memberRow.className = 'settings-row';
        var memberLabel = document.createElement('span');
        memberLabel.className = 'settings-label';
        memberLabel.textContent = 'Member since';
        var memberValue = document.createElement('span');
        memberValue.className = 'settings-value';
        memberValue.textContent = this.profile.createdAt ? new Date(this.profile.createdAt).toLocaleDateString() : '--';
        memberRow.appendChild(memberLabel);
        memberRow.appendChild(memberValue);
        accountCard.appendChild(memberRow);

        var logoutRow = document.createElement('div');
        logoutRow.className = 'settings-row';
        var logoutBtn = document.createElement('button');
        logoutBtn.className = 'friend-btn friend-btn-danger';
        logoutBtn.textContent = 'Sign Out';
        logoutBtn.style.marginLeft = 'auto';
        logoutBtn.addEventListener('click', function() {
            window.showAuth();
        });
        logoutRow.appendChild(logoutBtn);
        accountCard.appendChild(logoutRow);

        container.appendChild(accountCard);
    },

    editName: function() {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        var modal = document.createElement('div');
        modal.className = 'modal';

        var title = document.createElement('h3');
        title.textContent = 'Edit Name';
        modal.appendChild(title);

        var group = document.createElement('div');
        group.className = 'form-group';
        var label = document.createElement('label');
        label.textContent = 'Display Name';
        var input = document.createElement('input');
        input.type = 'text';
        input.value = this.profile.name;
        input.maxLength = 100;
        group.appendChild(label);
        group.appendChild(input);
        modal.appendChild(group);

        var actions = document.createElement('div');
        actions.className = 'modal-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() { overlay.remove(); });

        var saveBtn = document.createElement('button');
        saveBtn.className = 'modal-save';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', async function() {
            var newName = input.value.trim();
            if (!newName) {
                Toast.error('Name cannot be empty');
                return;
            }
            try {
                var result = await API.updateProfile({ name: newName });
                Settings.profile.name = result.name;
                localStorage.setItem('userName', result.name);
                document.getElementById('user-name').textContent = result.name;
                Toast.success('Name updated');
                overlay.remove();
                Settings.render();
            } catch (err) {
                Toast.error(err.message);
            }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        input.focus();
        input.select();
    },

    updateShareWeight: async function(value) {
        try {
            await API.updateProfile({ shareWeight: value });
            this.profile.shareWeight = value;
            Toast.success(value ? 'Weight sharing enabled' : 'Weight sharing disabled');
        } catch (err) {
            Toast.error(err.message);
            // Revert toggle
            this.render();
        }
    }
};
