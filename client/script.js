"use strict";

var conn; // websocket connection
var peerConnection;
var phoneNumber; // 手机号, 用于标识一个客户端
var dataChannel; // 数据channel, 可以用于发送文本消息
var targetnumber; // 目标号码
var textChanName = 'chat';
var localICEServer = {
	urls: 'turn:127.0.0.1:3478',
	username: 'test',
	credential: 'test'
} // ICEServer
var signalingURL = "ws://localhost:9999/signaling"; // signaling 服务地址

// DOMs
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const phoneDOM = document.getElementById("phone");
const textbtn = document.getElementById("textbtn");
const targetDOM = document.getElementById("callnumber");
const connectbtn = document.getElementById("connectbtn");
const messageDOM = document.getElementById("message");

var localStream;


function init() {
	phoneNumber = prompt("Please enter your phonenumber", "");
	phoneDOM.value = phoneNumber;

	// 获取摄像头
	navigator.mediaDevices.getUserMedia({ 'video': true, 'audio': true }).then(stream => {
		localStream = stream;
		localVideo.srcObject = stream;
	});

	// establish websocket
	conn = new WebSocket(signalingURL);
	conn.addEventListener('open', () => {
		console.log('opened');
		conn.send(JSON.stringify({
			'kind': 'setPhone',
			'phone': phoneNumber,
		}));
	});
	conn.addEventListener('close', () => {
		console.log('closed');
	});
	// websocket事件监听
	conn.addEventListener('message', eventhandler);
}

/// 处理signaling事件
function eventhandler(event) {
	console.log('event: ', event.data);
	let data = JSON.parse(event.data);
	console.log('kind: ', data['kind']);
	// offer
	switch (data['kind']) {
		case 'offer': // 收到offer
			handleOffer(data['offer'], data['from']);
			break;
		case 'answer': // 收到answer
			handleAnswer(data['answer'], data['from']);
			break;
		case 'candidate': // 收到candidate
			handleCandidate(data['candidate'])
			break;
	}
}




// 处理offer
function handleOffer(data, from) {
	if (data == null) {
		return
	}
	targetDOM.value = from; // 显示发送offer的号码
	targetDOM.disabled = true;
	connectbtn.disabled = true;

	// 创建连接
	peerConnection = createPeerConnection();
	peerConnection.onicecandidate = event => {
		if (event.candidate == null) { // This will be the empty string if the event indicates that there are no further candidates to come in this generation, or null if all ICE gathering on all transports is complete.
			let answer = peerConnection.localDescription
			console.log("answer: ", JSON.stringify(answer));
			conn.send(JSON.stringify({
				'kind': 'answer',
				'answer': answer,
				'from': phoneNumber,
				'to': targetDOM.value,
			}))
		} else { // send the candidate to remote peer

		}
	};

	// datachannel配置
	peerConnection.ondatachannel = event => {
		let chan = event.channel;
		if (chan.label === textChanName) {
			setupDatachannel(chan);
		}
	};

	peerConnection.onaddstream = stream => {
		console.log("add stream: ", stream);
	};
	peerConnection.setRemoteDescription(data).then(() => {
		console.log("setremote done.");
		peerConnection.createAnswer().then(answer => {
			peerConnection.setLocalDescription(answer).then(() => {
				console.log("setlocal done.")
			});
		})
	})
}

// 处理对方收到offer的answer
function handleAnswer(data) {
	if (data == null) {
		return
	}
	console.log("recv answer: ", data)
	peerConnection.setRemoteDescription(data).then(() => {
		console.log("setremote done.");
	}).catch(error => {
		console.log("setremote error: ", error);
	});
}

function handleCandidate(data) {
	if (!peerConnection) return;
	if (!data) {
		peerConnection.addIceCandidate(null);
	} else {
		peerConnection.addIceCandidate(data);
	}
}


function createPeerConnection() {
	let configuration = {
		iceServers: [localICEServer]
	};
	peerConnection = new RTCPeerConnection(configuration);
	peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];
	localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	return peerConnection;
}

function setupDatachannel(chan) {
	chan.onopen = () => textbtn.disabled = false;
	chan.onmessage = message => {
		alert("recv text: " + message.data);
	};
}


// 发起连接, 连接turn , 发送offer
function connect() {
	targetnumber = targetDOM.value;
	console.log("target :", targetnumber);
	peerConnection = createPeerConnection();
	dataChannel = peerConnection.createDataChannel(textChanName);
	setupDatachannel(dataChannel);

	// send candidates
	peerConnection.onicecandidate = event => {
		console.log("candidate: ", event);
		conn.send(JSON.stringify({
			'kind': 'candidate',
			'candidate': event.candidate,
			'from': phoneNumber,
			'to': targetnumber,
		}));
	};

	peerConnection.createOffer().then(offer => {
		peerConnection.setLocalDescription(offer);
		console.log("create offer done.")
		connectbtn.disabled = true;

		conn.send(JSON.stringify({
			'kind': 'offer',
			'from': phoneNumber,
			'to': targetnumber,
			'offer': offer
		}))

		console.log("send offer done.")
	}).catch(error => {
		console.log("create offer error: ", error);
	})
}

// 发送文本消息
function sendmessage() {
	dataChannel.send(messageDOM.value);
	messageDOM.value = "";
}
