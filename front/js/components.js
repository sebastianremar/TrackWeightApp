// Toast notifications
var Toast = {
    container: null,

    init: function() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show: function(message, type) {
        if (!this.container) this.init();
        type = type || 'info';
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(function() {
            toast.classList.add('toast-visible');
        });

        setTimeout(function() {
            toast.classList.remove('toast-visible');
            toast.addEventListener('transitionend', function() {
                toast.remove();
            });
        }, 3000);
    },

    success: function(msg) { this.show(msg, 'success'); },
    error: function(msg) { this.show(msg, 'error'); },
    info: function(msg) { this.show(msg, 'info'); }
};

// Loading spinner
var Spinner = {
    show: function(container) {
        var el = document.createElement('div');
        el.className = 'spinner-overlay';
        el.innerHTML = '<div class="spinner"></div>';
        container.style.position = 'relative';
        container.appendChild(el);
        return el;
    },

    hide: function(el) {
        if (el && el.parentNode) el.remove();
    }
};

// Confirmation dialog
var Confirm = {
    show: function(message, onConfirm) {
        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        var dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';

        var msg = document.createElement('p');
        msg.textContent = message;
        dialog.appendChild(msg);

        var actions = document.createElement('div');
        actions.className = 'confirm-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'confirm-btn confirm-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() {
            overlay.remove();
        });

        var okBtn = document.createElement('button');
        okBtn.className = 'confirm-btn confirm-ok';
        okBtn.textContent = 'Confirm';
        okBtn.addEventListener('click', function() {
            overlay.remove();
            onConfirm();
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }
};
