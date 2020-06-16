const express = require('express')
const path = require('path')

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'public'))
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html')

app.use('/', (req, res) => {
  res.render('index.html')
})

var rooms = []

const createRoom = (index) => {
  return { name: index, players: [], enemys: [] }
}

const searchRoom = () => {
  if (rooms.length === 0) {
    const room = createRoom(1)
    rooms.push(room)
    return room
  }
  let flag = false
  let selectedRoom = rooms.map((room) => {
    if (room.players.length < 2 && !flag) {
      flag = true
      return room
    }
  })

  selectedRoom = selectedRoom.filter((el) => {
    return el != null
  })

  if (selectedRoom === undefined || selectedRoom === null || selectedRoom.length === 0) {
    const newRoom = createRoom(rooms.length + 1)
    rooms.push(newRoom)

    return newRoom
  }

  return selectedRoom[0]
}

const searchRoomAndInsertPLayer = (SelectedRoom, player) => {
  rooms.map((child) => {
    if (child.name === SelectedRoom.name) {
      console.log(`\n[ADD] -> ${player}\n`)
      child.players.push(player)
    } else {
      // console.log(child.name, SelectedRoom.name)
    }
  })
}

const removePlayer = (playerId) => {
  rooms.map((child) => {
    child.players = child.players.filter((player) => player !== playerId)
    child.enemys = child.enemys.filter((player) => player.id !== playerId)
  })
}

const customSocketEmit = (socket, result) => {
  socket.emit(result)
}

const compareMove = (player1, player2) => {
  if (player1.jogada.includes('pedra')) {
    if (player2.jogada.includes('papel')) {
      customSocketEmit(player2.socket, 'ganhou')
      customSocketEmit(player1.socket, 'perdeu')
    }
    if (player2.jogada.includes('tesoura')) {
      customSocketEmit(player1.socket, 'ganhou')
      customSocketEmit(player2.socket, 'perdeu')
    }
    if (player2.jogada.includes('pedra')) {
      customSocketEmit(player1.socket, 'empate')
      customSocketEmit(player2.socket, 'empate')
    }
  } else if (player1.jogada.includes('papel')) {
    if (player2.jogada.includes('papel')) {
      customSocketEmit(player1.socket, 'empate')
      customSocketEmit(player2.socket, 'empate')
    }
    if (player2.jogada.includes('tesoura')) {
      customSocketEmit(player1.socket, 'perdeu')
      customSocketEmit(player2.socket, 'ganhou')
    }
    if (player2.jogada.includes('pedra')) {
      customSocketEmit(player2.socket, 'perdeu')
      customSocketEmit(player1.socket, 'ganhou')
    }
  } else if (player1.jogada.includes('tesoura')) {
    if (player2.jogada.includes('papel')) {
      customSocketEmit(player2.socket, 'perdeu')
      customSocketEmit(player1.socket, 'ganhou')
    }
    if (player2.jogada.includes('tesoura')) {
      customSocketEmit(player1.socket, 'empate')
      customSocketEmit(player2.socket, 'empate')
    }
    if (player2.jogada.includes('pedra')) {
      customSocketEmit(player1.socket, 'perdeu')
      customSocketEmit(player2.socket, 'ganhou')
    }
  }
}

const fakeSocket = {
  emit: (string) => {}
}

const playWithBot = ({ socket, jogada }) => {
  const option = ['pedra', 'papel', 'tesoura']

  const selectedOption = option[Math.floor(Math.random() * 2) + 1]
  console.log('[BOT]-> ', selectedOption, jogada)
  compareMove({ socket, jogada: jogada.toLowerCase() }, { socket: fakeSocket, jogada: selectedOption })
}

const sendEnemyName = (clients) => {
  let player1
  let player2

  clients.map((elemente, index) => {
    if (index === 0) {
      player1 = elemente
    }
    if (index === 1) {
      player2 = elemente
    }
  })

  player1.socket.emit('enemy', player2.name)
  player2.socket.emit('enemy', player1.name)
}

const randomName = () => {
  const names = ['Joao', 'Maria', 'Augusto', 'Lima', 'XLR8', 'Javascrito']
  const index = Math.floor(Math.random() * 5) + 1
  return names[index]
}

io.on('connection', function (socket) {
  let newRoom

  socket.on('setPlayer', (data) => {
    newRoom = searchRoom()
    if (data.name) {
      newRoom.enemys.push({ socket, name: data.name, id: socket.id })
    } else {
      socket.name = randomName()
    }

    searchRoomAndInsertPLayer(newRoom, socket.id)
    console.log(rooms)

    // socket.emit('message', 'Procurando')

    let cont = 1
    const loop = setInterval(() => {
      cont += 1
      let clients

      if (io.sockets.adapter.rooms['room-' + newRoom.name]) {
        clients = io.sockets.adapter.rooms['room-' + newRoom.name].length
      }
      if (io.nsps['/'].adapter.rooms['room-' + newRoom.name] && io.nsps['/'].adapter.rooms['room-' + newRoom.name].length < 2) {
        socket.emit('timeSearch', `${cont}s`)
      }
      if (cont === 10 && clients < 2) {
        if (newRoom.players.length < 2) {
          socket.emit('timeEnd', 'Opa, ninguém apareceu...\n Vai um Bot aí?')
        }
        console.log('[DELETE] ->', socket.id)
        removePlayer(socket.id)
        socket.leave('room-' + newRoom.name)
        console.log(rooms)
        clearInterval(loop)
        socket.bot = true
        socket.emit('enemy', randomName())
      }
      if (!clients || clients > 1) {
        console.log('[CLEAR] LOOP')
        clearInterval(loop)
      }
    }, 1000)

    socket.loop = loop
    socket.join('room-' + newRoom.name)

    if (!io.sockets.in('room-' + newRoom.name).enemys) {
      io.sockets.in('room-' + newRoom.name).enemys = []
    }

    io.sockets.in('room-' + newRoom.name).enemys.push({ socket, name: socket.name })

    if (newRoom.players.length > 1) {
      io.sockets.in('room-' + newRoom.name).emit('timeEnd', 'Opa, Achou :}')
      sendEnemyName(newRoom.enemys)
    }
  })

  socket.on('play', (data) => {
    if (socket.bot) {
      // playWithBot({ socket, jogada: data })
      setTimeout(() => {
        playWithBot({ socket, jogada: data })
      }, Math.floor(Math.random() * 3000) + 1)
    } else {
      if (!io.sockets.in('room-' + newRoom.name).jogadas) {
        // cria o vetor das jogadas
        io.sockets.in('room-' + newRoom.name).jogadas = []
      }

      // coloca a jogada de algum dos sockets e salva qual socket foi
      io.sockets.in('room-' + newRoom.name).jogadas.push({ socket, jogada: data })

      // se tem mais que 1, ja ta na hora da sala ficar fechada
      if (io.sockets.in('room-' + newRoom.name).jogadas.length > 1) {
        // const clients = io.sockets.adapter.rooms['room-' + newRoom.name].sockets

        // io.to(clients[0])
        const players = io.sockets.in('room-' + newRoom.name).jogadas

        let player1
        let player2

        players.map((elemente, index) => {
          if (index === 0) {
            player1 = { socket: elemente.socket, jogada: elemente.jogada }
          }
          if (index === 1) {
            player2 = { socket: elemente.socket, jogada: elemente.jogada }
          }
        })

        player1.jogada = player1.jogada.toLowerCase()
        player2.jogada = player2.jogada.toLowerCase()

        // falando o nome do inimigo

        // player2.socket.emit('enemy', player1.socket.name)

        compareMove(player1, player2)
        io.sockets.in('room-' + newRoom.name).jogadas = []
      }
    }
  })

  socket.on('end', function () {
    console.log(`\n[LEAVE] -> ${socket.id}\n`)
    socket.disconnect(0)
    if (newRoom) {
      removePlayer(socket.id)
      socket.leave('room-' + newRoom.name)
      console.log(rooms)
      if (newRoom.players.length < 2) {
        io.sockets.in('room-' + newRoom.name).emit('connectToRoom', 'Opa, você ta sozinho agora :{')
      }
    }
  })
})

server.listen(3000)
