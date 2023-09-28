
var conn;
var peerConnection;
var phone;
var dataChannel;
var targetnumber;
var localICEServer = {
	urls: 'turn:172.29.0.156:3478',
	username: 'test',
	credential: 'test'
}
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
var localStream;


function init() {
	phone = prompt("Please enter your phonenumber", "");
	document.getElementById("phone").value = phone;
	navigator.mediaDevices.getUserMedia({ 'video': true, 'audio': true }).then(stream => {
		localStream = stream;
		localVideo.srcObject = stream;
	});
		// establish websocket
		conn = new WebSocket('ws://localhost:9999/signaling');
	conn.addEventListener('open', () => {
		console.log('opened');
		conn.send(JSON.stringify({
			'kind': 'setPhone',
			'phone': phone,
		}));
	});
	conn.addEventListener('close', () => {
		console.log('closed');
	});
	conn.addEventListener('message', eventhandler);
}

/// 处理signaling事件
function eventhandler(event) {
	console.log('event: ', event.data);
	let data = JSON.parse(event.data);
	console.log('kind: ', data['kind']);
	// offer
	switch (data['kind']) {
		case 'offer':
			handleOffer(data['offer'], data['from']);
			break;
		case 'answer':
			handleAnswer(data['answer'], data['from']);
			break;
		case 'callstart':
			handleCallstart();
			break;
	}

}


function handleAnswerCandidate(event) {
	if (event.candidate == null) {
		answer = peerConnection.localDescription
		console.log("answer: ", JSON.stringify(answer));
		conn.send(JSON.stringify({
			'kind': 'answer',
			'answer': answer,
			'from': phone,
			'to': document.getElementById("callnumber").value,
		}))
	}
}

// datachannel event
function handledatachannel(event) {
	console.log('handledatachannel');
	dataChannel = event.channel;
	dataChannel.onopen = datachannelopen;
	dataChannel.onmessage = datachannelmessage;
}


// 处理offer
function handleOffer(data, from) {
	if (data == null) {
		return
	}
	document.getElementById("callnumber").value = from;
	document.getElementById("callnumber").disabled = true;
	document.getElementById("connectbtn").disabled = true;
	peerConnection = createPeerConnection(handleAnswerCandidate);
	peerConnection.ondatachannel = handledatachannel;
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


function createPeerConnection(candidatehandler) {
	configuration = {
		iceServers: [localICEServer]
	};
	peerConnection = new RTCPeerConnection(configuration);
	peerConnection.onicecandidate = candidatehandler;
	peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];
	localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	return peerConnection;
}

function datachannelopen() {
	console.log('datachannelopen');
	document.getElementById("textbtn").disabled = false;
}

function datachannelmessage(message) {
	console.log('datachannelmessage: ', message);
	alert("recv text: " + message.data);
}

function handleOfferCandidate(event) {
	console.log("candidate: ", event);
	if (event.candidate != null) {
		offer = peerConnection.localDescription;
		console.log("offer: ", offer);
		conn.send(JSON.stringify({
			'kind': 'offer',
			'from': phone,
			'to': targetnumber,
			'offer': offer
		}))
	}
}


function connect() {
	targetnumber = document.getElementById("callnumber").value;
	console.log("target :", targetnumber);
	peerConnection = createPeerConnection(handleOfferCandidate);
	dataChannel = peerConnection.createDataChannel('chat');
	dataChannel.onopen = datachannelopen;
	dataChannel.onmessage = datachannelmessage;

	peerConnection.createOffer().then(offer => {
		peerConnection.setLocalDescription(offer);
		console.log("create offer done.")
		document.getElementById("connectbtn").disabled = true;
	})
}


function sendmessage() {
	text = document.getElementById("message").value;
	dataChannel.send(text);
}
