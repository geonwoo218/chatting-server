const express = require('express'); //express 모듈 가져오기
const app = express(); //express 객체 생성
const bodyParser = require('body-parser'); //body-parser 모듈 가져오기
const WebSocket = require('ws'); //ws 모듈 가져오기
const { v4: uuidv4 } = require('uuid');

app.use(express.static('public')); //정적 파일 제공
app.use(express.urlencoded({ extended: true })); //urlencoded 형식으로 데이터 추출
app.use(bodyParser.json()); //json 형식으로 데이터 추출

app.get('/', function (req, res) { //홈페이지
    res.sendFile(__dirname + '/index.html'); //index.html 파일 전송
});

app.listen(8080, function () { //8080 포트로 서버 실행
    console.log('8080 서버 만듬');
});

const socket = new WebSocket.Server({ //웹 소켓 생성
    port: 1010 //포트로 연결
});

var channels = {};

const findChannel = (id) => {
    for (let k in channels) {
        let channel = channels[k];
        if (id in channel) {
            return channel;
        }
    }
    return false;
}

socket.on('connection', (ws) => { //웹 소켓 연결 시
    const id = uuidv4();
    console.log(`새로운 클라이언트 ${id}가 연결됨`);
    ws.on("message", (msg) => { //메시지 수신 시
        try {
            const data = JSON.parse(msg);
            if (!data.act) { console.error("잘못된 요청: act 파라미터가 존재하지 않습니다."); }
            
            // 파라미터 처리
            if (data.act == "join") {
                if (!findChannel(id)) {
                    const roomName = data.value;
                    let channel = channels[roomName];
                    if (!channel) {
                        channel = {};
                        channels[roomName] = channel;
                    }
                    
                    channel[id] = ws;
                    ws.send(JSON.stringify({
                        message: `${roomName}로 접속했습니다.`
                    }));
                } else {
                    ws.send(JSON.stringify({
                        message: `${id}는 이미 접속된 상태입니다.`
                    }));
                }
            } else if (data.act == "send") {
                let channel = findChannel(id);
                if (channel) {
                    const message = data.value;
                    // console.log(`data: ${msg}`)
                    const dataToSend = JSON.stringify({ id: id, message: message});

                    // broadcast
                    for (let id in channel) {
                        let member = channel[id];
                        member.send(dataToSend);
                    }
                } else {
                    ws.send(JSON.stringify({
                        message: `${id}는 채널에 접속된 상태가 아닙니다.`
                    }));
                }
            }
        } catch (e) {
            console.log(`메시지를 parse 하는 도중 에러가 발생했습니다. ${msg}`);
        }
    });
})


app.post('/posttext', (req, res) => { //POST 요청 처리
    const data = req.body; //body에 데이터 추출
    console.log(`요청 받은 메세지: ${data.메세지}`);

    socket.clients.forEach(function (clients) { //웹 소켓 클라이언트에게 메시지 전송
        if (clients.readyState === WebSocket.OPEN) { //연결 상태 확인
            clients.send(JSON.stringify({ id: uuidv4(), message: data.메세지 })); //메시지 전송
        }
    })
});
