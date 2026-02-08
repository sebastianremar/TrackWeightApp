var Friends = {
    friends: [],
    requests: [],

    load: async function() {
        var container = document.getElementById('screen-friends');
        container.innerHTML = '';
        var spinner = Spinner.show(container);

        try {
            var [friendsResult, requestsResult] = await Promise.all([
                API.getFriends(),
                API.getFriendRequests()
            ]);
            this.friends = friendsResult.friends || [];
            this.requests = requestsResult.requests || [];
        } catch (err) {
            Spinner.hide(spinner);
            Toast.error(err.message);
            return;
        }

        Spinner.hide(spinner);
        this.render();
    },

    render: function() {
        var container = document.getElementById('screen-friends');
        container.innerHTML = '';

        // Pending requests card
        if (this.requests.length > 0) {
            var reqCard = document.createElement('section');
            reqCard.className = 'card';

            var reqTitle = document.createElement('h2');
            reqTitle.textContent = 'Friend Requests';
            var badge = document.createElement('span');
            badge.className = 'pending-badge';
            badge.textContent = this.requests.length;
            reqTitle.appendChild(badge);
            reqCard.appendChild(reqTitle);

            this.requests.forEach(function(req) {
                var item = document.createElement('div');
                item.className = 'friend-item';

                var avatar = document.createElement('div');
                avatar.className = 'friend-avatar';
                avatar.textContent = (req.name || req.email).charAt(0).toUpperCase();

                var info = document.createElement('div');
                info.className = 'friend-info';
                var nameEl = document.createElement('div');
                nameEl.className = 'friend-name';
                nameEl.textContent = req.name || req.email;
                var emailEl = document.createElement('div');
                emailEl.className = 'friend-email';
                emailEl.textContent = req.email;
                info.appendChild(nameEl);
                info.appendChild(emailEl);

                var actions = document.createElement('div');
                actions.className = 'friend-actions';

                var acceptBtn = document.createElement('button');
                acceptBtn.className = 'friend-btn friend-btn-accept';
                acceptBtn.textContent = 'Accept';
                acceptBtn.addEventListener('click', function() {
                    Friends.respond(req.email, true);
                });

                var rejectBtn = document.createElement('button');
                rejectBtn.className = 'friend-btn friend-btn-danger';
                rejectBtn.textContent = 'Reject';
                rejectBtn.addEventListener('click', function() {
                    Friends.respond(req.email, false);
                });

                actions.appendChild(acceptBtn);
                actions.appendChild(rejectBtn);

                item.appendChild(avatar);
                item.appendChild(info);
                item.appendChild(actions);
                reqCard.appendChild(item);
            });

            container.appendChild(reqCard);
        }

        // Friends list card
        var friendsCard = document.createElement('section');
        friendsCard.className = 'card';

        var friendsTitle = document.createElement('h2');
        friendsTitle.textContent = 'Friends';
        friendsCard.appendChild(friendsTitle);

        if (this.friends.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No friends yet. Add someone to get started!';
            friendsCard.appendChild(empty);
        } else {
            this.friends.forEach(function(friend) {
                var item = document.createElement('div');
                item.className = 'friend-item';

                var avatar = document.createElement('div');
                avatar.className = 'friend-avatar';
                avatar.textContent = (friend.name || friend.email).charAt(0).toUpperCase();

                var info = document.createElement('div');
                info.className = 'friend-info';
                var nameEl = document.createElement('div');
                nameEl.className = 'friend-name';
                nameEl.textContent = friend.name;
                var emailEl = document.createElement('div');
                emailEl.className = 'friend-email';
                emailEl.textContent = friend.email;
                info.appendChild(nameEl);
                info.appendChild(emailEl);

                var actions = document.createElement('div');
                actions.className = 'friend-actions';

                if (friend.shareWeight) {
                    var viewBtn = document.createElement('button');
                    viewBtn.className = 'friend-btn friend-btn-primary';
                    viewBtn.textContent = 'View Progress';
                    viewBtn.addEventListener('click', function() {
                        Friends.showComparison(friend);
                    });
                    actions.appendChild(viewBtn);
                }

                var removeBtn = document.createElement('button');
                removeBtn.className = 'friend-btn friend-btn-danger';
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', function() {
                    Confirm.show('Remove ' + friend.name + ' as a friend?', function() {
                        Friends.remove(friend.email);
                    });
                });
                actions.appendChild(removeBtn);

                item.appendChild(avatar);
                item.appendChild(info);
                item.appendChild(actions);
                friendsCard.appendChild(item);
            });
        }

        // Add friend button
        var addBtn = document.createElement('button');
        addBtn.className = 'habit-add-btn';
        addBtn.textContent = '+ Add Friend';
        addBtn.addEventListener('click', function() {
            Friends.showAddModal();
        });
        friendsCard.appendChild(addBtn);

        container.appendChild(friendsCard);
    },

    respond: async function(email, accept) {
        try {
            await API.respondToRequest(email, accept);
            Toast.success(accept ? 'Request accepted' : 'Request rejected');
            this.load();
        } catch (err) {
            Toast.error(err.message);
        }
    },

    remove: async function(email) {
        try {
            await API.removeFriend(email);
            Toast.success('Friend removed');
            this.load();
        } catch (err) {
            Toast.error(err.message);
        }
    },

    showAddModal: function() {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        var modal = document.createElement('div');
        modal.className = 'modal';

        var title = document.createElement('h3');
        title.textContent = 'Add Friend';
        modal.appendChild(title);

        var group = document.createElement('div');
        group.className = 'form-group';
        var label = document.createElement('label');
        label.textContent = 'Friend\'s Email';
        var input = document.createElement('input');
        input.type = 'email';
        input.placeholder = 'friend@example.com';
        group.appendChild(label);
        group.appendChild(input);
        modal.appendChild(group);

        var actions = document.createElement('div');
        actions.className = 'modal-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() { overlay.remove(); });

        var sendBtn = document.createElement('button');
        sendBtn.className = 'modal-save';
        sendBtn.textContent = 'Send Request';
        sendBtn.addEventListener('click', async function() {
            var email = input.value.trim();
            if (!email) {
                Toast.error('Please enter an email');
                return;
            }
            try {
                await API.sendFriendRequest(email);
                Toast.success('Friend request sent!');
                overlay.remove();
                Friends.load();
            } catch (err) {
                Toast.error(err.message);
            }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(sendBtn);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        input.focus();
    },

    showComparison: async function(friend) {
        try {
            // Get my weight data and friend's
            var fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 90);
            var fromStr = fromDate.toISOString().split('T')[0];

            var [myResult, friendResult] = await Promise.all([
                API.getWeightHistory(fromStr),
                API.getFriendWeight(friend.email)
            ]);

            var myEntries = myResult.entries || [];
            var friendEntries = friendResult.entries || [];

            if (myEntries.length === 0 && friendEntries.length === 0) {
                Toast.info('No weight data to compare');
                return;
            }

            renderCompareChart(myEntries, friendEntries, friend.name);
        } catch (err) {
            Toast.error(err.message);
        }
    }
};
