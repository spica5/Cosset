'use client';

import type { IBrandProduct, IBrandCategory } from 'src/types/brand-store';

import { toast } from 'sonner';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import CardContent from '@mui/material/CardContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { uuidv4 } from 'src/utils/uuidv4';

import { uploadFileToS3 } from 'src/actions/upload';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  createBrandStore,
  updateBrandStore,
  createBrandProduct,
  updateBrandProduct,
  deleteBrandProduct,
  useGetMyBrandStore,
  createBrandCategory,
  updateBrandCategory,
  deleteBrandCategory,
  useGetBrandProducts,
  useGetBrandCategories,
} from 'src/actions/brand-store';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin, isUserBusiness } from 'src/auth/utils/role';

import { getBrandProductImages } from 'src/types/brand-store';

import { BrandImageField, BrandMultiImageField, BrandProductImageGallery } from '../brand-image-field';

// ----------------------------------------------------------------------

type CategoryForm = {
  name: string;
  description: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  currency: string;
  categoryId: string;
  images: string[];
  isAvailable: boolean;
};

const emptyCategoryForm: CategoryForm = { name: '', description: '' };
const emptyProductForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  currency: 'USD',
  categoryId: '',
  images: [],
  isAvailable: true,
};

export function BrandsMyStoreView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const canManage = isUserBusiness(user?.role) || isUserAdmin(user?.role);

  const { store, storeLoading } = useGetMyBrandStore(canManage);
  const storeId = store?.id || '';
  const { categories, categoriesLoading } = useGetBrandCategories(storeId);
  const { products, productsLoading } = useGetBrandProducts(storeId);

  const [storeForm, setStoreForm] = useState({
    name: '',
    tagline: '',
    description: '',
    coverImage: '',
    logoImage: '',
    isPublic: true,
  });
  const [savingStore, setSavingStore] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IBrandCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [savingCategory, setSavingCategory] = useState(false);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IBrandProduct | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [savingProduct, setSavingProduct] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<'all' | number>('all');

  useEffect(() => {
    if (!store) {
      return;
    }

    setStoreForm({
      name: store.name,
      tagline: store.tagline || '',
      description: store.description || '',
      coverImage: store.coverImage || '',
      logoImage: store.logoImage || '',
      isPublic: store.isPublic !== false,
    });
  }, [store]);

  const uploadBrandImage = useCallback(
    async (file: File, folder: 'cover' | 'logo' | 'product') => {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const ownerSegment = String(user?.id || 'guest');
      const entitySegment = store?.id || 'draft';
      const key = `brand-stores/${ownerSegment}/${entitySegment}/${folder}/${uuidv4()}.${extension}`;
      const result = await uploadFileToS3({ file, key, isPublic: false });
      return result.key || key;
    },
    [store?.id, user?.id],
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === 'all') return products;
    return products.filter((product) => product.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  if (!canManage) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="My Store"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Community' },
            { name: 'Brands Boulevard', href: paths.dashboard.community.brandsBoulevard.root },
            { name: 'My Store' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <EmptyContent
          filled
          title="Business account required"
          description="Request a business account in Settings → Account to open your storefront on Brands Boulevard."
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              onClick={() => router.push(paths.dashboard.settings.account)}
            >
              Go to Account settings
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  const handleCreateStore = async () => {
    if (!storeForm.name.trim() || savingStore) return;

    try {
      setSavingStore(true);
      await createBrandStore({
        name: storeForm.name.trim(),
        tagline: storeForm.tagline.trim() || null,
        description: storeForm.description.trim() || null,
        isPublic: storeForm.isPublic,
        coverImage: storeForm.coverImage.trim() || null,
        logoImage: storeForm.logoImage.trim() || null,
      });
      toast.success('Your store is open on Brands Boulevard');
      router.push(paths.dashboard.community.brandsBoulevard.root);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create store');
    } finally {
      setSavingStore(false);
    }
  };

  const handleSaveStore = async () => {
    if (!store || !storeForm.name.trim() || savingStore) return;

    try {
      setSavingStore(true);
      await updateBrandStore(store.id, {
        name: storeForm.name.trim(),
        tagline: storeForm.tagline.trim() || null,
        description: storeForm.description.trim() || null,
        isPublic: storeForm.isPublic,
        coverImage: storeForm.coverImage.trim() || null,
        logoImage: storeForm.logoImage.trim() || null,
      });
      toast.success('Store updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update store');
    } finally {
      setSavingStore(false);
    }
  };

  const handleStoreImageUpload = async (file: File, field: 'coverImage' | 'logoImage') => {
    const setUploading = field === 'coverImage' ? setUploadingCover : setUploadingLogo;

    try {
      setUploading(true);
      const key = await uploadBrandImage(file, field === 'coverImage' ? 'cover' : 'logo');
      setStoreForm((prev) => ({ ...prev, [field]: key }));
      toast.success(field === 'coverImage' ? 'Cover image uploaded' : 'Logo uploaded');
    } catch (error) {
      console.error('Failed to upload store image', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: IBrandCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
    });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!store || !categoryForm.name.trim() || savingCategory) return;

    try {
      setSavingCategory(true);
      if (editingCategory) {
        await updateBrandCategory(store.id, editingCategory.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null,
        });
        toast.success('Category updated');
      } else {
        await createBrandCategory(store.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null,
        });
        toast.success('Category created');
      }
      setCategoryDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: IBrandCategory) => {
    if (!store) return;
    if (!window.confirm(`Delete category "${category.name}" and its products?`)) return;

    try {
      await deleteBrandCategory(store.id, category.id);
      toast.success('Category deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      ...emptyProductForm,
      categoryId: categories[0] ? String(categories[0].id) : '',
    });
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: IBrandProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price || '',
      currency: product.currency || 'USD',
      categoryId: String(product.categoryId),
      images: getBrandProductImages(product),
      isAvailable: product.isAvailable !== false,
    });
    setProductDialogOpen(true);
  };

  const handleProductImagesUpload = async (files: File[]) => {
    if (!files.length) return;

    try {
      setUploadingProductImage(true);
      const uploadedKeys = await Promise.all(files.map((file) => uploadBrandImage(file, 'product')));
      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedKeys.filter(Boolean)],
      }));
      toast.success(
        uploadedKeys.length > 1 ? `${uploadedKeys.length} images uploaded` : 'Product image uploaded',
      );
    } catch (error) {
      console.error('Failed to upload product images', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!store || !productForm.name.trim() || !productForm.categoryId || savingProduct) return;

    try {
      setSavingProduct(true);
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price: productForm.price.trim() || null,
        currency: productForm.currency.trim() || 'USD',
        categoryId: Number(productForm.categoryId),
        images: productForm.images,
        imageUrl: productForm.images[0] || null,
        isAvailable: productForm.isAvailable,
      };

      if (editingProduct) {
        await updateBrandProduct(store.id, editingProduct.id, payload);
        toast.success('Product updated');
      } else {
        await createBrandProduct(store.id, payload);
        toast.success('Product added');
      }
      setProductDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: IBrandProduct) => {
    if (!store) return;
    if (!window.confirm(`Delete product "${product.name}"?`)) return;

    try {
      await deleteBrandProduct(store.id, product.id);
      toast.success('Product deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="My Store"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Brands Boulevard', href: paths.dashboard.community.brandsBoulevard.root },
          { name: 'My Store' },
        ]}
        action={
          store ? (
            <Button
              variant="outlined"
              onClick={() =>
                router.push(paths.dashboard.community.brandsBoulevard.store(store.id))
              }
            >
              Preview storefront
            </Button>
          ) : undefined
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {storeLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading your store...
        </Typography>
      ) : !store ? (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
              <Typography variant="h5">Open your store on Brands Boulevard</Typography>
              <Typography variant="body2" color="text.secondary">
                This page is only for your business account. Create your shop window, then add
                categories and products with our tools.
              </Typography>
              <TextField
                label="Store name"
                value={storeForm.name}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, name: event.target.value }))}
                fullWidth
              />
              <TextField
                label="Tagline"
                value={storeForm.tagline}
                onChange={(event) =>
                  setStoreForm((prev) => ({ ...prev, tagline: event.target.value }))
                }
                fullWidth
              />
              <TextField
                label="Description"
                value={storeForm.description}
                onChange={(event) =>
                  setStoreForm((prev) => ({ ...prev, description: event.target.value }))
                }
                fullWidth
                multiline
                minRows={3}
              />
              <BrandImageField
                label="Cover image"
                value={storeForm.coverImage}
                uploading={uploadingCover}
                disabled={savingStore}
                helperText="Shown on the boulevard store card"
                onUpload={(file) => handleStoreImageUpload(file, 'coverImage')}
                onRemove={() => setStoreForm((prev) => ({ ...prev, coverImage: '' }))}
              />
              <BrandImageField
                label="Logo"
                value={storeForm.logoImage}
                uploading={uploadingLogo}
                disabled={savingStore}
                helperText="Small brand mark on your storefront"
                previewHeight={96}
                onUpload={(file) => handleStoreImageUpload(file, 'logoImage')}
                onRemove={() => setStoreForm((prev) => ({ ...prev, logoImage: '' }))}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={storeForm.isPublic}
                    onChange={(event) =>
                      setStoreForm((prev) => ({ ...prev, isPublic: event.target.checked }))
                    }
                  />
                }
                label="Show on public boulevard"
              />
              <Button
                variant="contained"
                disabled={!storeForm.name.trim() || savingStore || uploadingCover || uploadingLogo}
                onClick={handleCreateStore}
                sx={{ alignSelf: 'flex-start' }}
              >
                {savingStore ? 'Opening store...' : 'Open my store'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Typography variant="h6">Store profile</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Store name"
                      value={storeForm.name || store.name}
                      onChange={(event) =>
                        setStoreForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Tagline"
                      value={storeForm.tagline}
                      onChange={(event) =>
                        setStoreForm((prev) => ({ ...prev, tagline: event.target.value }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Description"
                      value={storeForm.description}
                      onChange={(event) =>
                        setStoreForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      fullWidth
                      multiline
                      minRows={3}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <BrandImageField
                      label="Cover image"
                      value={storeForm.coverImage}
                      uploading={uploadingCover}
                      disabled={savingStore}
                      helperText="Boulevard storefront banner"
                      onUpload={(file) => handleStoreImageUpload(file, 'coverImage')}
                      onRemove={() => setStoreForm((prev) => ({ ...prev, coverImage: '' }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <BrandImageField
                      label="Logo"
                      value={storeForm.logoImage}
                      uploading={uploadingLogo}
                      disabled={savingStore}
                      helperText="Brand mark on your store"
                      previewHeight={96}
                      onUpload={(file) => handleStoreImageUpload(file, 'logoImage')}
                      onRemove={() => setStoreForm((prev) => ({ ...prev, logoImage: '' }))}
                    />
                  </Grid>
                </Grid>
                <FormControlLabel
                  control={
                    <Switch
                      checked={storeForm.isPublic}
                      onChange={(event) =>
                        setStoreForm((prev) => ({ ...prev, isPublic: event.target.checked }))
                      }
                    />
                  }
                  label="Show on public boulevard"
                />
                <Button
                  variant="contained"
                  disabled={savingStore || uploadingCover || uploadingLogo}
                  onClick={handleSaveStore}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {savingStore ? 'Saving...' : 'Save store'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Categories</Typography>
                  <Button variant="outlined" onClick={openCreateCategory}>
                    Add category
                  </Button>
                </Stack>

                {categoriesLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    Loading categories...
                  </Typography>
                ) : categories.length ? (
                  <Grid container spacing={1.5}>
                    {categories.map((category) => (
                      <Grid item xs={12} md={6} key={category.id}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <Typography variant="subtitle1">{category.name}</Typography>
                              <Chip size="small" label={`${category.productCount || 0} products`} />
                            </Stack>
                            {category.description ? (
                              <Typography variant="body2" color="text.secondary">
                                {category.description}
                              </Typography>
                            ) : null}
                            <Stack direction="row" spacing={1}>
                              <Button size="small" onClick={() => openEditCategory(category)}>
                                Edit
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleDeleteCategory(category)}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Create categories to organize your products.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={1.5}
                >
                  <Typography variant="h6">Products</Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      size="small"
                      value={String(selectedCategoryId)}
                      onChange={(event) => {
                        const {value} = event.target;
                        setSelectedCategoryId(value === 'all' ? 'all' : Number(value));
                      }}
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value="all">All categories</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="contained"
                      disabled={!categories.length}
                      onClick={openCreateProduct}
                    >
                      Add product
                    </Button>
                  </Stack>
                </Stack>

                {productsLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    Loading products...
                  </Typography>
                ) : filteredProducts.length ? (
                  <Grid container spacing={1.5}>
                    {filteredProducts.map((product) => (
                      <Grid item xs={12} sm={6} md={4} key={product.id}>
                        <Box
                          sx={{
                            p: 2,
                            height: 1,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Stack spacing={1}>
                            <BrandProductImageGallery
                              imageKeys={getBrandProductImages(product)}
                              alt={product.name}
                              height={120}
                            />
                            <Typography variant="subtitle1">{product.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {product.categoryName || 'Uncategorized'}
                            </Typography>
                            {product.price ? (
                              <Typography variant="body2">
                                {product.currency || 'USD'} {product.price}
                              </Typography>
                            ) : null}
                            <Chip
                              size="small"
                              color={product.isAvailable ? 'success' : 'default'}
                              label={product.isAvailable ? 'Available' : 'Hidden'}
                              sx={{ alignSelf: 'flex-start' }}
                            />
                            <Stack direction="row" spacing={1}>
                              <Button size="small" onClick={() => openEditProduct(product)}>
                                Edit
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleDeleteProduct(product)}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {categories.length
                      ? 'No products yet. Add your first product.'
                      : 'Add a category before creating products.'}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingCategory ? 'Edit category' : 'New category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Description"
              value={categoryForm.description}
              onChange={(event) =>
                setCategoryForm((prev) => ({ ...prev, description: event.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!categoryForm.name.trim() || savingCategory}
            onClick={handleSaveCategory}
          >
            {savingCategory ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingProduct ? 'Edit product' : 'New product'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={productForm.name}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, name: event.target.value }))
              }
              fullWidth
            />
            <TextField
              select
              label="Category"
              value={productForm.categoryId}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))
              }
              fullWidth
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={productForm.description}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, description: event.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
            <BrandMultiImageField
              label="Product images"
              values={productForm.images}
              uploading={uploadingProductImage}
              disabled={savingProduct}
              helperText="Upload photos or videos. Click a thumbnail to open the gallery."
              onUpload={handleProductImagesUpload}
              onRemove={(index) =>
                setProductForm((prev) => ({
                  ...prev,
                  images: prev.images.filter((_, imageIndex) => imageIndex !== index),
                }))
              }
            />
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Price"
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, price: event.target.value }))
                }
                fullWidth
              />
              <TextField
                label="Currency"
                value={productForm.currency}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, currency: event.target.value }))
                }
                sx={{ width: 120 }}
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={productForm.isAvailable}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, isAvailable: event.target.checked }))
                  }
                />
              }
              label="Available in storefront"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !productForm.name.trim() ||
              !productForm.categoryId ||
              savingProduct ||
              uploadingProductImage
            }
            onClick={handleSaveProduct}
          >
            {savingProduct ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
