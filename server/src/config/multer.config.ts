// src/config/multer.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/contracts',
    filename: (req, file, callback) => {
      const uniqueSuffix = uuidv4();
      const ext = extname(file.originalname);
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(pdf|jpg|jpeg|png)$/)) {
      return callback(
        new Error('Only document and image files are allowed!'),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};

export const multerCompanyConfig = {
  storage: diskStorage({
    destination: './uploads/company',
    filename: (req, file, callback) => {
      const uniqueSuffix = uuidv4();
      const ext = extname(file.originalname);
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};
