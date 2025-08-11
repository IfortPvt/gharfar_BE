const Image = require('../models/Image');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');

const UPLOAD_DIR = 'uploads/properties';

const createImages = async (images, listingId) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Reset main/featured flags if specified in new images
      if (images.some(img => img.isMainImage)) {
        await Image.updateMany(
          { listing: listingId },
          { isMainImage: false },
          { session }
        );
      }
      if (images.some(img => img.isFeatured)) {
        await Image.updateMany(
          { listing: listingId },
          { isFeatured: false },
          { session }
        );
      }

      // Create new images
      const createdImages = await Image.create(
        images.map(img => ({
          ...img,
          listing: listingId,
        })),
        { session }
      );

      return createdImages;
    });
  } finally {
    session.endSession();
  }
};

const reorderImages = async (listingId, imageOrders) => {
  const updates = imageOrders.map(({ imageId, order }) => ({
    updateOne: {
      filter: { _id: imageId, listing: listingId },
      update: { $set: { order } }
    }
  }));

  return await Image.bulkWrite(updates);
};

const setMainImage = async (listingId, imageId) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Remove main image flag from all property images
      await Image.updateMany(
        { listing: listingId },
        { isMainImage: false },
        { session }
      );

      // Set new main image
      await Image.findOneAndUpdate(
        { _id: imageId, listing: listingId },
        { isMainImage: true },
        { session }
      );
    });
  } finally {
    session.endSession();
  }
};

const setFeaturedImage = async (listingId, imageId) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Remove featured flag from all property images
      await Image.updateMany(
        { listing: listingId },
        { isFeatured: false },
        { session }
      );

      // Set new featured image
      await Image.findOneAndUpdate(
        { _id: imageId, listing: listingId },
        { isFeatured: true },
        { session }
      );
    });
  } finally {
    session.endSession();
  }
};

const uploadImages = async (listingId,images) => {
  const uploadedImages = [];

  for (const image of images) {

    // Create image record
    const newImage = await Image.create({
      listing: listingId,
      url: `${UPLOAD_DIR}/${image.filename}`,
      order: uploadedImages.length
    });

    uploadedImages.push(newImage._id);
  }

  return uploadedImages;
};

const deleteImage = async (imageId) => {
  const image = await Image.findById(imageId);
  if (!image) return;

  // Delete file from storage
  try {
    await fs.unlink(path.join(process.cwd(), image.url));
  } catch (error) {
    console.error('Error deleting image file:', error);
  }

  // Delete image record
  await Image.findByIdAndDelete(imageId);
};

const updateImagesOrder = async (imageOrder) => {
  if (!Array.isArray(imageOrder)) throw new Error('imageOrder must be an array');

  const updates = imageOrder.map(({ imageId, order }) => {
    let id = imageId;
    console.log("id", id);
   // if (typeof id === 'string') {
      // Handle ObjectId('...') string
      // const match = id.match(/^ObjectId\(['"]?([a-fA-F0-9]{24})['"]?\)$/);
      // if (match) {
      //   id = match[1];
      // }
      // // Convert to ObjectId only if it's a valid hex string and not already an ObjectId
      // if (mongoose.Types.ObjectId.isValid(id) && !(id instanceof mongoose.Types.ObjectId)) {
      //   id = mongoose.Types.ObjectId(id);
      // }
  //  }
    return {
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: order } }
      }
    };
  });

  console.log("updates", updates);

  return await Image.bulkWrite(updates);
};

const updateImageFlags = async (listingId, imageId, flags) => {
  const { isFeatured, isMainImage } = flags;

  if (isFeatured) {
    // Remove featured flag from all property images
    await Image.updateMany(
      { listing: listingId },
      { isFeatured: false }
    );
  }

  if (isMainImage) {
    // Remove main image flag from all property images
    await Image.updateMany(
      { listing: listingId },
      { isMainImage: false }
    );
  }

  // Update flags for the specified image
  return await Image.findByIdAndUpdate(
    imageId,
    { isFeatured, isMainImage },
    { new: true }
  );
};

module.exports = {
  createImages,
  reorderImages,
  setMainImage,
  setFeaturedImage,
  uploadImages,
  deleteImage,
  updateImagesOrder,
  updateImageFlags
};