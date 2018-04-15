window.onload = function() {
    var rdChat = new RdChat();
    rdChat.init();
};
var RdChat = function() {
    this.socket = null;
};
RdChat.prototype = {
    init: function() {
        var that = this;
        var userList = {};//用户列表
        var userCount = null;//用户数
        this.socket = io.connect('ws://192.168.1.198:3000');
        this.socket.on('connect', function() {//用户登录
            document.getElementById('info').textContent = 'get yourself a nickname :)';
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
        });
        this.socket.on('nickExisted', function() {
            document.getElementById('info').textContent = '!nickname is taken, choose another pls';
        });
        this.socket.on('loginSuccess', function(o) {
            document.title = 'RdChat | ' + document.getElementById('nicknameInput').value;
            this.userList = o.onlineUsers;
            that._initUserList(o.onlineUsers);
            document.getElementById('loginWrapper').style.display = 'none';
            document.getElementById('messageInput').focus();
        });
        this.socket.on('error', function(err) {
            if (document.getElementById('loginWrapper').style.display == 'none') {
                document.getElementById('status').textContent = '!fail to connect :(';
            } else {
                document.getElementById('info').textContent = '!fail to connect :(';
            }
        });
        this.socket.on('system', function(obj, userCount, type) {
            var msg = obj.nickname + (type == 'login' ? ' joined' : ' left');
            that._displayNewMsg('system ', msg, 'red');
            if(type == 'login' && !this.userList.hasOwnProperty(obj.userid)){
                that._updateUserList(obj);
            }
            if(document.getElementById('userlist').value == ""){
                document.getElementById('status').textContent = userCount + (userCount > 1 ? ' users' : ' user') + ' online';
            }else{
                if(document.getElementById('userlist').value == obj.userid){
                    document.getElementById('status').textContent = obj.nickname + "  " + type;
                }
            }

        });
        this.socket.on('newMsg', function(user, msg, color) {
            that._displayNewMsg(user, msg, color);
        });
        this.socket.on('newImg', function(user, img, color) {
            that._displayImage(user, img, color);
        });
        document.getElementById('loginBtn').addEventListener('click', function() {//监听登录按钮的click事件
            var nickName = document.getElementById('nicknameInput').value;
            var userid = that._getUid();
            if (nickName.trim().length != 0) {
                that.socket.emit('login', {userid:userid, nickname:nickName});
            } else {
                document.getElementById('nicknameInput').focus();
            };
        }, false);
        document.getElementById('nicknameInput').addEventListener('keyup', function(e) {//监听回车键事件
            if (e.keyCode == 13) {
                var nickName = document.getElementById('nicknameInput').value;
                var userid = that._getUid();
                if (nickName.trim().length != 0) {
                    that.socket.emit('login', {userid:userid, nickname:nickName});
                };
            };
        }, false);
        document.getElementById('sendBtn').addEventListener('click', function() {//监听消息发送的click事件
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            messageInput.value = '';
            messageInput.focus();
            if (msg.trim().length != 0) {
                if(document.getElementById('userlist').value == ''){//判断是广播消息还是私聊
                    that.socket.emit('postMsg', msg, color);
                    that._displayNewMsg('me', msg, color);
                    return;
                }else{
                    that.socket.emit('privateMsg', msg, color, document.getElementById('userlist').value);
                    that._displayNewMsg('me', msg, color);
                    return;
                }

            };
        }, false);
        document.getElementById('messageInput').addEventListener('keyup', function(e) {//监听键盘事件（回车发送消息）
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            if (e.keyCode == 13 && msg.trim().length != 0) {
                messageInput.value = '';
                if(document.getElementById('userlist').value == ''){
                    that.socket.emit('postMsg', msg, color);
                    that._displayNewMsg('me', msg, color);
                }else{
                    that.socket.emit('privateMsg', msg, color, document.getElementById('userlist').value);
                    that._displayNewMsg('me', msg, color);
                }
            };
        }, false);
        document.getElementById('clearBtn').addEventListener('click', function() {
            document.getElementById('historyMsg').innerHTML = '';
        }, false);
        document.getElementById('sendImage').addEventListener('change', function() {//发送文件按钮监听事件
            if (this.files.length != 0) {
                var file = this.files[0],
                    reader = new FileReader(),
                    color = document.getElementById('colorStyle').value;
                if (!reader) {
                    that._displayNewMsg('system', '!your browser doesn\'t support fileReader', 'red');
                    this.value = '';
                    return;
                };
                reader.onload = function(e) {
                    this.value = '';
                    if(document.getElementById('userlist').value == ""){
                        that.socket.emit('img', e.target.result, color);
                        that._displayImage('me', e.target.result, color);//在聊天窗口显示自己发送的图片
                    }else{
                        that.socket.emit('privateimg', e.target.result, color, document.getElementById('userlist').value);
                        that._displayImage('me', e.target.result, color);
                    }

                };
                reader.readAsDataURL(file);
            };
        }, false);
        this._initialEmoji();//初始化聊天表情
        document.getElementById('emoji').addEventListener('click', function(e) {//发送聊天表情
            var emojiwrapper = document.getElementById('emojiWrapper');
            emojiwrapper.style.display = 'block';
            e.stopPropagation();
        }, false);
        document.body.addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            if (e.target != emojiwrapper) {
                emojiwrapper.style.display = 'none';
            };
        });
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
            var target = e.target;
            if (target.nodeName.toLowerCase() == 'img') {
                var messageInput = document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
            };
        }, false);
    },
    _initialEmoji: function() {//创建表情的html内容
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();
        for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../content/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);
    },
    _displayNewMsg: function(user, msg, color) {//展示新信息
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8),
        //判断消息中是否包含表情
            msg = this._showEmoji(msg);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _displayImage: function(user, imgData, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');//todo:fix this in chrome it will cause a new request for the image
            };
        };
        return result;
    },
    _getUid:function(){//得到用户标识
        return new Date().getTime()+""+Math.floor(Math.random()*899+100);
    },
    _updateUserList:function(obj){//更新用户列表
        var container = document.getElementById('userlist'),
            optDisplay = document.createElement('option');
        optDisplay.style.color = '#000';
        optDisplay.value = obj.userid;
        optDisplay.innerHTML = obj.nickname;
        container.appendChild(optDisplay);
        container.scrollTop = container.scrollHeight;

    },
    _initUserList:function(userList){//初始化用户列表
        var container = document.getElementById('userlist');
        for(key in userList) {
            if(userList.hasOwnProperty(key)){
                var optDisplay = document.createElement('option');
                optDisplay.style.color = '#000';
                optDisplay.value = key;
                optDisplay.innerHTML = userList[key];
                container.appendChild(optDisplay);
                container.scrollTop = container.scrollHeight;
            }
        }
    }
};