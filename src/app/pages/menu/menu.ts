import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para *ngFor

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu {
  // Datos simulados
  platillos = [
    { nombre: 'Taco de Atún Picante', precio: 85, categoria: 'Fusión', desc: 'Tortilla de maíz, atún fresco, aguacate y mayo chipotle.' },
    { nombre: 'Roll SushiGo', precio: 140, categoria: 'Sushi', desc: 'Camarón tempura, queso crema y salsa de mango.' },
    { nombre: 'Nigiri de Salmón', precio: 60, categoria: 'Sushi', desc: 'Dos piezas de salmón sobre arroz.' },
    { nombre: 'Tostada de Ceviche', precio: 95, categoria: 'Fusión', desc: 'Pescado blanco, limón, cilantro y chile serrano.' },
  ];
}