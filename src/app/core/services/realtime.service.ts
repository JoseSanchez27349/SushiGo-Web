import { Injectable, OnDestroy, signal, inject, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface NuevaComandaEvent {
  ordenId: string;
  folio: string | number;
  mesa: string | null;
  tipoOrden: string;
  esRondaAdicional: boolean;
}

export interface OrdenCanceladaEvent {
  ordenId: string;
  folio: string | number;
}

export interface PosOrdenActualizadaEvent {
  ordenId: string;
  itemNombre?: string;
  cantidad?: number;
  estadoItem?: string;
  estadoCocina?: string;
  ordenCompletaLista: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeService implements OnDestroy {
  // Inyectamos NgZone para asegurarnos de que Angular reaccione
  private zone = inject(NgZone);
  private socket: Socket;
  private audioCtx: AudioContext | null = null;

  isConnected = signal<boolean>(false);
  soundEnabled = signal<boolean>(true);

  private nuevaComanda$ = new Subject<NuevaComandaEvent>();
  private ordenCancelada$ = new Subject<OrdenCanceladaEvent>();
  private posOrdenActualizada$ = new Subject<PosOrdenActualizadaEvent>();
  private cajaSubject = new Subject<any>();

  constructor() {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.zone.run(() => this.isConnected.set(true));
    });

    this.socket.on('disconnect', () => {
      this.zone.run(() => this.isConnected.set(false));
    });

    // 🛠️ Forzamos a Angular a detectar el cambio con zone.run
    this.socket.on('cocina:nueva-comanda', (data: NuevaComandaEvent) => {
      this.zone.run(() => this.nuevaComanda$.next(data));
    });

    this.socket.on('cocina:orden-cancelada', (data: OrdenCanceladaEvent) => {
      this.zone.run(() => this.ordenCancelada$.next(data));
    });

    this.socket.on('pos:orden-actualizada', (data: PosOrdenActualizadaEvent) => {
      this.zone.run(() => this.posOrdenActualizada$.next(data));
    });

    this.socket.on('caja:actualizada', (data: any) => {
      this.zone.run(() => this.cajaSubject.next(data));
    });
  }

  onNuevaComanda(): Observable<NuevaComandaEvent> {
    return this.nuevaComanda$.asObservable();
  }

  onOrdenCancelada(): Observable<OrdenCanceladaEvent> {
    return this.ordenCancelada$.asObservable();
  }

  onPosOrdenActualizada(): Observable<PosOrdenActualizadaEvent> {
    return this.posOrdenActualizada$.asObservable();
  }

  onCajaActualizada(): Observable<any> {
    return this.cajaSubject.asObservable();
  }

  toggleSound(): void {
    this.soundEnabled.update((v) => !v);
    if (this.soundEnabled()) {
      this.playBellChime();
    }
  }

  playKitchenAlert(): void {
    if (!this.soundEnabled()) return;
    this.playTone(587.33, 0, 0.14, 'triangle');
    this.playTone(880.0, 0.16, 0.25, 'triangle');
  }

  playBellChime(): void {
    if (!this.soundEnabled()) return;
    this.playTone(1046.5, 0, 0.35, 'sine');
    this.playTone(1318.5, 0.12, 0.45, 'sine');
  }

  private playTone(
    frequency: number,
    delaySec: number,
    durationSec: number,
    type: OscillatorType,
  ): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime + delaySec;
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      oscillator.start(now);
      oscillator.stop(now + durationSec + 0.02);
    } catch {
      // Ignorar bloqueo de audio
    }
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}