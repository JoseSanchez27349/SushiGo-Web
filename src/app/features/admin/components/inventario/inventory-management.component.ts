import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../../../../core/services/inventory.service';
import { MenuService } from '../../../../core/services/menu.service';
import { Ingredient, RecipeItem } from '../../../../core/models/inventory.model';
import { Product } from '../../../../core/models/menu.model';

@Component({
  selector: 'app-inventory-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventory-management.component.html'
})
export class InventoryManagementComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private menuService = inject(MenuService);

  // Navegación por pestañas
  activeTab = signal<'inventario' | 'recetas'>('inventario');

  // Datos principales
  ingredientes = signal<Ingredient[]>([]);
  productos = signal<Product[]>([]);
  onlyLowStock = signal<boolean>(false);

  // Filtro de ingredientes
  filteredIngredientes = computed(() => {
    const list = this.ingredientes();
    if (!this.onlyLowStock()) return list;
    return list.filter(i => i.bajoStock || Number(i.stockActual) <= Number(i.stockMinimo));
  });

  // Conteo de alertas de stock bajo
  lowStockCount = computed(() =>
    this.ingredientes().filter(i => i.bajoStock || Number(i.stockActual) <= Number(i.stockMinimo)).length
  );

  // Estados de carga y mensajes
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Modal Ingrediente
  isIngModalOpen = signal<boolean>(false);
  editingIngredient = signal<Ingredient | null>(null);
  ingForm = {
    nombre: '',
    unidadMedida: 'g',
    stockActual: 0,
    stockMinimo: 0,
    costoUnitario: 0
  };

  // ==================== ESTADO RECETAS (BOM) ====================
  selectedProductId = signal<string>('');
  currentRecipeItems = signal<RecipeItem[]>([]);
  isLoadingRecipe = signal<boolean>(false);

  // Selector para agregar insumo a la receta actual
  newRecipeItem = {
    ingredienteId: '',
    cantidad: 1
  };

  // Producto actualmente seleccionado
  selectedProduct = computed(() =>
    this.productos().find(p => p.id === this.selectedProductId()) || null
  );

  // Cálculo dinámico del costo de producción mientras editas la receta
  costoProduccionCalculado = computed(() => {
    return this.currentRecipeItems().reduce((acc, item) => {
      const costoUnit = Number(item.ingrediente.costoUnitario || 0);
      const cant = Number(item.cantidadRequerida || 0);
      return acc + costoUnit * cant;
    }, 0);
  });

  // Margen estimado dinámico
  margenEstimadoCalculado = computed(() => {
    const prod = this.selectedProduct();
    if (!prod) return 0;
    return Number(prod.precio) - this.costoProduccionCalculado();
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.inventoryService.getIngredientes().subscribe({
      next: (res) => {
        this.ingredientes.set(res.ingredientes);
        this.loadProductos();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar el inventario');
        this.isLoading.set(false);
      }
    });
  }

  loadProductos(): void {
    this.menuService.getProductos().subscribe({
      next: (res) => {
        this.productos.set(res.productos);
        this.isLoading.set(false);
        if (res.productos.length > 0 && !this.selectedProductId()) {
          this.onSelectProduct(res.productos[0].id);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar productos');
        this.isLoading.set(false);
      }
    });
  }

  // ==================== CRUD INGREDIENTES ====================

  openCreateIngredientModal(): void {
    this.editingIngredient.set(null);
    this.ingForm = {
      nombre: '',
      unidadMedida: 'g',
      stockActual: 0,
      stockMinimo: 0,
      costoUnitario: 0
    };
    this.errorMessage.set('');
    this.isIngModalOpen.set(true);
  }

  openEditIngredientModal(ing: Ingredient): void {
    this.editingIngredient.set(ing);
    this.ingForm = {
      nombre: ing.nombre,
      unidadMedida: ing.unidadMedida,
      stockActual: Number(ing.stockActual),
      stockMinimo: Number(ing.stockMinimo),
      costoUnitario: Number(ing.costoUnitario)
    };
    this.errorMessage.set('');
    this.isIngModalOpen.set(true);
  }

  closeIngredientModal(): void {
    this.isIngModalOpen.set(false);
    this.errorMessage.set('');
  }

  saveIngredient(): void {
    if (!this.ingForm.nombre.trim() || !this.ingForm.unidadMedida.trim()) {
      this.errorMessage.set('El nombre y la unidad de medida son obligatorios');
      return;
    }

    if (this.ingForm.stockActual < 0 || this.ingForm.stockMinimo < 0 || this.ingForm.costoUnitario < 0) {
      this.errorMessage.set('Los valores numéricos deben ser mayores o iguales a 0');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    const current = this.editingIngredient();

    const payload = {
      nombre: this.ingForm.nombre.trim(),
      unidadMedida: this.ingForm.unidadMedida.trim(),
      stockActual: Number(this.ingForm.stockActual),
      stockMinimo: Number(this.ingForm.stockMinimo),
      costoUnitario: Number(this.ingForm.costoUnitario)
    };

    if (current) {
      this.inventoryService.updateIngrediente(current.id, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.successMessage.set(res.message);
          this.closeIngredientModal();
          this.loadInitialData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al actualizar ingrediente');
        }
      });
    } else {
      this.inventoryService.createIngrediente(payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.successMessage.set(res.message);
          this.closeIngredientModal();
          this.loadInitialData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al registrar ingrediente');
        }
      });
    }
  }

  deleteIngredient(ing: Ingredient): void {
    if (!confirm(`¿Eliminar el insumo "${ing.nombre}" del inventario?`)) return;

    this.inventoryService.deleteIngrediente(ing.id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.loadInitialData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al eliminar ingrediente');
      }
    });
  }

  // ==================== GESTIÓN DE RECETAS (BOM) ====================

  onSelectProduct(productoId: string): void {
    this.selectedProductId.set(productoId);
    this.errorMessage.set('');
    this.successMessage.set('');
    if (!productoId) {
      this.currentRecipeItems.set([]);
      return;
    }

    this.isLoadingRecipe.set(true);
    this.inventoryService.getRecetaProducto(productoId).subscribe({
      next: (res) => {
        this.currentRecipeItems.set(res.receta);
        this.isLoadingRecipe.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar la receta del producto');
        this.isLoadingRecipe.set(false);
      }
    });
  }

  addIngredientToRecipe(): void {
    this.errorMessage.set('');
    if (!this.newRecipeItem.ingredienteId) {
      this.errorMessage.set('Selecciona un insumo para agregar a la receta');
      return;
    }

    const cant = Number(this.newRecipeItem.cantidad);
    if (isNaN(cant) || cant <= 0) {
      this.errorMessage.set('La cantidad requerida debe ser mayor a 0');
      return;
    }

    const ingObj = this.ingredientes().find(i => i.id === this.newRecipeItem.ingredienteId);
    if (!ingObj) return;

    // Si ya existe en la receta, sumar o actualizar la cantidad
    const existsIndex = this.currentRecipeItems().findIndex(
      item => item.ingredienteId === ingObj.id
    );

    if (existsIndex >= 0) {
      this.currentRecipeItems.update(items =>
        items.map((item, idx) =>
          idx === existsIndex
            ? { ...item, cantidadRequerida: Number(item.cantidadRequerida) + cant }
            : item
        )
      );
    } else {
      this.currentRecipeItems.update(items => [
        ...items,
        {
          ingredienteId: ingObj.id,
          cantidadRequerida: cant,
          ingrediente: ingObj
        }
      ]);
    }

    this.newRecipeItem = { ingredienteId: '', cantidad: 1 };
  }

  removeRecipeItem(item: RecipeItem): void {
    const prodId = this.selectedProductId();
    // Si ya está guardado en BD (tiene id), eliminarlo también en backend o actualizar estado local
    if (item.id && prodId) {
      this.inventoryService.removeIngredienteDeReceta(prodId, item.ingredienteId).subscribe({
        next: (res) => {
          this.currentRecipeItems.update(list =>
            list.filter(i => i.ingredienteId !== item.ingredienteId)
          );
          this.successMessage.set(res.message);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error al remover ingrediente');
        }
      });
    } else {
      this.currentRecipeItems.update(list =>
        list.filter(i => i.ingredienteId !== item.ingredienteId)
      );
    }
  }

  saveFullRecipe(): void {
    const prodId = this.selectedProductId();
    if (!prodId) return;

    this.isSaving.set(true);
    this.errorMessage.set('');

    const payload = {
      ingredientes: this.currentRecipeItems().map(item => ({
        ingredienteId: item.ingredienteId,
        cantidad: Number(item.cantidadRequerida)
      }))
    };

    this.inventoryService.saveRecetaProducto(prodId, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.successMessage.set(res.message);
        this.currentRecipeItems.set(res.receta);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar la receta');
      }
    });
  }
}