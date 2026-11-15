import { Injectable, OnDestroy, signal } from '@angular/core';
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
  private socket: Socket;
  private audioCtx: AudioContext | null = null;

  isConnected = signal<boolean>(false);
  soundEnabled = signal<boolean>(true);

  private nuevaComanda$ = new Subject<NuevaComandaEvent>();
  private ordenCancelada$ = new Subject<OrdenCanceladaEvent>();
  private posOrdenActualizada$ = new Subject<PosOrdenActualizadaEvent>();

  constructor() {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnected.set(true);
    });

    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
    });

    this.socket.on('cocina:nueva-comanda', (data: NuevaComandaEvent) => {
      this.nuevaComanda$.next(data);
    });

    this.socket.on('cocina:orden-cancelada', (data: OrdenCanceladaEvent) => {
      this.ordenCancelada$.next(data);
    });

    this.socket.on('pos:orden-actualizada', (data: PosOrdenActualizadaEvent) => {
      this.posOrdenActualizada$.next(data);
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
    return new Observable((observer) => {
      const handler = (payload: any) => observer.next(payload);
      this.socket.on('caja:actualizada', handler);
      return () => this.socket.off('caja:actualizada', handler);
    });
  }

  toggleSound(): void {
    this.soundEnabled.update((v) => !v);
    if (this.soundEnabled()) {
      this.playBellChime();
    }
  }

  // Timbre doble para Cocina cuando entra una comanda o ronda nueva
  playKitchenAlert(): void {
    if (!this.soundEnabled()) return;
    this.playTone(587.33, 0, 0.14, 'triangle');   // Re5
    this.playTone(880.0, 0.16, 0.25, 'triangle'); // La5
  }

  // Campana de servicio para POS cuando un platillo o pedido completo está listo
  playBellChime(): void {
    if (!this.soundEnabled()) return;
    this.playTone(1046.5, 0, 0.35, 'sine');       // Do6
    this.playTone(1318.5, 0.12, 0.45, 'sine');    // Mi6
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
      // El navegador requiere una interacción previa del usuario antes de reproducir audio
    }
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}