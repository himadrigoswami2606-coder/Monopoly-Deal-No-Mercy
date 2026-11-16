import React, { useState, useEffect } from 'react';
import { useSocket } from './contexts/SocketContext';
import {
  Room,
  Player,
  GameState,
  Card,
  PublicPlayerView,
  WinConditionResult,
  EVENT_ROOM_CREATED,
  EVENT_ROOM_JOINED,
  EVENT_ROOM_UPDATED,
  EVENT_GAME_STARTED,
  EVENT_GAME_STATE_UPDATE,
  EVENT_GAME_OVER,
  EVENT_ERROR,
  EVENT_HOST_CHANGED,
} from '../../shared/types';
import { LandingScreen } from './components/LandingScreen';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { WinModal } from './components/WinModal';

type AppScreen = 'landing' | 'lobby' | 'game';

export const App: React.FC = () => {
  const { socket } = useSocket();

  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [displayName, setDisplayName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [publicPlayers, setPublicPlayers] = useState<PublicPlayerView[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gameOverData, setGameOverData] = useState<{
    winner: PublicPlayerView;
    breakdown: WinConditionResult;
  } | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Room Created
    socket.on(EVENT_ROOM_CREATED, (data: { room: Room; player: Player }) => {
      setRoom(data.room);
      setCurrentPlayer(data.player);
      setErrorMessage(null);
      setCurrentScreen('lobby');
    });

    // Room Joined
    socket.on(EVENT_ROOM_JOINED, (data: { room: Room; player: Player }) => {
      setRoom(data.room);
      setCurrentPlayer(data.player);
      setErrorMessage(null);
      setCurrentScreen('lobby');
    });

    // Room Updated
    socket.on(EVENT_ROOM_UPDATED, (data: { room: Room }) => {
      setRoom(data.room);
      // Update currentPlayer reference if in room
      if (currentPlayer) {
        const updatedSelf = data.room.players.find((p) => p.id === currentPlayer.id);
        if (updatedSelf) {
          setCurrentPlayer(updatedSelf);
        }
      }
    });

    // Game Started
    socket.on(EVENT_GAME_STARTED, (data: { room: Room; myHand: Card[] }) => {
      setRoom(data.room);
      setMyHand(data.myHand);
      if (data.room.gameState) {
        setGameState(data.room.gameState);
      }
      setErrorMessage(null);
      setCurrentScreen('game');
    });

    // Authoritative Game State Update
    socket.on(
      EVENT_GAME_STATE_UPDATE,
      (data: {
        gameState: GameState;
        myHand: Card[];
        players: PublicPlayerView[];
        myPlayer: Player;
      }) => {
        setGameState(data.gameState);
        setMyHand(data.myHand);
        setPublicPlayers(data.players);
        setCurrentPlayer(data.myPlayer);
      }
    );

    // Game Over
    socket.on(
      EVENT_GAME_OVER,
      (data: { winner: PublicPlayerView; breakdown: WinConditionResult }) => {
        setGameOverData(data);
      }
    );

    // Host Changed Notification
    socket.on(EVENT_HOST_CHANGED, (data: { newHostId: string; newHostName: string }) => {
      console.log(`[App] Host transferred to ${data.newHostName}`);
    });

    // Server Error
    socket.on(EVENT_ERROR, (data: { message: string }) => {
      setErrorMessage(data.message);
    });

    return () => {
      socket.off(EVENT_ROOM_CREATED);
      socket.off(EVENT_ROOM_JOINED);
      socket.off(EVENT_ROOM_UPDATED);
      socket.off(EVENT_GAME_STARTED);
      socket.off(EVENT_GAME_STATE_UPDATE);
      socket.off(EVENT_GAME_OVER);
      socket.off(EVENT_HOST_CHANGED);
      socket.off(EVENT_ERROR);
    };
  }, [socket, currentPlayer]);

  const handleLeaveLobby = () => {
    setRoom(null);
    setCurrentPlayer(null);
    setGameState(null);
    setMyHand([]);
    setPublicPlayers([]);
    setErrorMessage(null);
    setCurrentScreen('landing');
  };

  const handleCloseWinModal = () => {
    setGameOverData(null);
    // Return to lobby
    if (room) {
      setCurrentScreen('lobby');
    } else {
      setCurrentScreen('landing');
    }
  };

  return (
    <>
      {currentScreen === 'landing' && (
        <LandingScreen
          displayName={displayName}
          setDisplayName={setDisplayName}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
        />
      )}

      {currentScreen === 'lobby' && room && currentPlayer && (
        <Lobby
          room={room}
          currentPlayer={currentPlayer}
          onLeave={handleLeaveLobby}
          errorMessage={errorMessage}
        />
      )}

      {currentScreen === 'game' && room && gameState && currentPlayer && (
        <GameBoard
          room={room}
          gameState={gameState}
          myHand={myHand}
          myPlayer={currentPlayer}
          players={publicPlayers.length > 0 ? publicPlayers : (room.players as any)}
        />
      )}

      {/* Win Celebration Modal */}
      {gameOverData && (
        <WinModal
          winner={gameOverData.winner}
          breakdown={gameOverData.breakdown}
          onClose={handleCloseWinModal}
        />
      )}
    </>
  );
};
