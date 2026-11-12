import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MenuService } from '../../../../core/services/menu.service';
import { Category, Product } from '../../../../core/models/menu.model';
import { ProductRecipeResponse } from '../../../../core/models/inventory.model';
import  { InventoryService } from '../../../../core/services/inventory.service';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './menu-management.component.html'
})
export class MenuManagementComponent implements OnInit {
  private menuService = inject(MenuService);
  private inventoryService = inject(InventoryService);

  // Pestaña activa
  activeTab = signal<'productos' | 'categorias'>('productos');

  // Datos principales
  categorias = signal<Category[]>([]);
  productos = signal<Product[]>([]);
  selectedCategoryFilter = signal<number | null>(null);

  // Productos filtrados reactivamente
  filteredProductos = computed(() => {
    const catId = this.selectedCategoryFilter();
    const list = this.productos();
    if (!catId) return list;
    return list.filter(p => p.categoriaId === catId);
  });

  // Estados de carga y alertas
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Modal Categoría
  isCatModalOpen = signal<boolean>(false);
  editingCategory = signal<Category | null>(null);
  catForm = {
    nombre: '',
    descripcion: '',
    estaActiva: true
  };

  // Modal Producto
  isProdModalOpen = signal<boolean>(false);
  editingProduct = signal<Product | null>(null);
  prodForm = {
    categoriaId: 0,
    nombre: '',
    descripcion: '',
    precio: 0,
    urlImagen: '',
    estaDisponible: true
  };

  // Modal Ver Receta (BOM)
  isRecipeModalOpen = signal<boolean>(false);
  isLoadingRecipe = signal<boolean>(false);
  selectedRecipeData = signal<ProductRecipeResponse | null>(null);

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading.set(true);
    this.menuService.getCategorias().subscribe({
      next: (res) => {
        this.categorias.set(res.categorias);
        this.loadProductos();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar categorías');
        this.isLoading.set(false);
      }
    });
  }

  loadProductos(): void {
    this.menuService.getProductos().subscribe({
      next: (res) => {
        this.productos.set(res.productos);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar productos');
        this.isLoading.set(false);
      }
    });
  }

  // ==================== VER RECETA DEL PRODUCTO ====================

  openRecipeModal(prod: Product): void {
    this.errorMessage.set('');
    this.selectedRecipeData.set(null);
    this.isRecipeModalOpen.set(true);
    this.isLoadingRecipe.set(true);

    this.inventoryService.getRecetaProducto(prod.id).subscribe({
      next: (res) => {
        this.selectedRecipeData.set(res);
        this.isLoadingRecipe.set(false);
      },
      error: (err) => {
        this.isLoadingRecipe.set(false);
        this.errorMessage.set(err.error?.message || 'Error al consultar la receta del producto');
      }
    });
  }

  closeRecipeModal(): void {
    this.isRecipeModalOpen.set(false);
    this.selectedRecipeData.set(null);
    this.errorMessage.set('');
  }

  hasEnoughStock(stockActual: number | string, cantidadRequerida: number | string): boolean {
    return Number(stockActual) >= Number(cantidadRequerida);
  }

  // ==================== ACCIONES CATEGORÍAS ====================

  openCreateCategoryModal(): void {
    this.editingCategory.set(null);
    this.catForm = { nombre: '', descripcion: '', estaActiva: true };
    this.errorMessage.set('');
    this.isCatModalOpen.set(true);
  }

  openEditCategoryModal(cat: Category): void {
    this.editingCategory.set(cat);
    this.catForm = {
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      estaActiva: cat.estaActiva
    };
    this.errorMessage.set('');
    this.isCatModalOpen.set(true);
  }

  closeCategoryModal(): void {
    this.isCatModalOpen.set(false);
    this.errorMessage.set('');
  }

  saveCategory(): void {
    if (!this.catForm.nombre.trim()) {
      this.errorMessage.set('El nombre de la categoría es obligatorio');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    const current = this.editingCategory();

    if (current) {
      this.menuService.updateCategoria(current.id, {
        nombre: this.catForm.nombre.trim(),
        descripcion: this.catForm.descripcion.trim(),
        estaActiva: this.catForm.estaActiva
      }).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.successMessage.set(res.message);
          this.closeCategoryModal();
          this.loadAllData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al actualizar categoría');
        }
      });
    } else {
      this.menuService.createCategoria({
        nombre: this.catForm.nombre.trim(),
        descripcion: this.catForm.descripcion.trim() || undefined
      }).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.successMessage.set(res.message);
          this.closeCategoryModal();
          this.loadAllData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al crear categoría');
        }
      });
    }
  }

  deleteCategory(cat: Category): void {
    if (!confirm(`¿Eliminar o desactivar la categoría "${cat.nombre}"?`)) return;

    this.menuService.deleteCategoria(cat.id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        if (this.selectedCategoryFilter() === cat.id) {
          this.selectedCategoryFilter.set(null);
        }
        this.loadAllData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al eliminar categoría');
      }
    });
  }

  // ==================== ACCIONES PRODUCTOS ====================

  openCreateProductModal(): void {
    if (this.categorias().length === 0) {
      this.errorMessage.set('Primero debes crear al menos una categoría');
      return;
    }

    this.editingProduct.set(null);
    this.prodForm = {
      categoriaId: this.selectedCategoryFilter() || this.categorias()[0].id,
      nombre: '',
      descripcion: '',
      precio: 0,
      urlImagen: '',
      estaDisponible: true
    };
    this.errorMessage.set('');
    this.isProdModalOpen.set(true);
  }

  openEditProductModal(prod: Product): void {
    this.editingProduct.set(prod);
    this.prodForm = {
      categoriaId: prod.categoriaId,
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      precio: Number(prod.precio),
      urlImagen: prod.urlImagen || '',
      estaDisponible: prod.estaDisponible
    };
    this.errorMessage.set('');
    this.isProdModalOpen.set(true);
  }

  closeProductModal(): void {
    this.isProdModalOpen.set(false);
    this.errorMessage.set('');
  }

  saveProduct(): void {
    if (!this.prodForm.nombre.trim() || !this.prodForm.categoriaId) {
      this.errorMessage.set('El nombre y la categoría son obligatorios');
      return;
    }

    if (this.prodForm.precio < 0 || isNaN(Number(this.prodForm.precio))) {
      this.errorMessage.set('Ingresa un precio válido mayor o igual a 0');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    const current = this.editingProduct();

    const payload = {
      categoriaId: Number(this.prodForm.categoriaId),
      nombre: this.prodForm.nombre.trim(),
      descripcion: this.prodForm.descripcion.trim() || undefined,
      precio: Number(this.prodForm.precio),
      urlImagen: this.prodForm.urlImagen.trim() || undefined,
      estaDisponible: this.prodForm.estaDisponible
    };

    if (current) {
      this.menuService.updateProducto(current.id, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.successMessage.set(res.message);
          this.closeProductModal();
          this.loadAllData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al actualizar producto');
        }
      });
    } else {
      this.menuService.createProducto(payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.successMessage.set(res.message);
          this.closeProductModal();
          this.loadAllData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al crear producto');
        }
      });
    }
  }

  deleteProduct(prod: Product): void {
    if (!confirm(`¿Eliminar o deshabilitar el producto "${prod.nombre}"?`)) return;

    this.menuService.deleteProducto(prod.id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.loadAllData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al eliminar producto');
      }
    });
  }
}