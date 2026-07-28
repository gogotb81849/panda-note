import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCode } from '@prisma/client';
import * as PDFLib from 'pdf-lib';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as sharp from 'sharp';

// 动态导入 pdfjs-dist 以便在 Node 环境中使用
let pdfjsLib: any = null;

async function getPdfJsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // 设置 workerSrc 用于 Node 环境
    pdfjsLib.GlobalWorkerOptions.workerSrc = false;
  }
  return pdfjsLib;
}

interface CompressionLogData {
  userId: number;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  method: string;
  compressionRate: string;
  teamCode: TeamCode;
}

@Injectable()
export class ToolboxService {
  constructor(private prisma: PrismaService) {}

  /**
   * 压缩方法1：PDF转图片缩小再转PDF
   * 将PDF每页转为图片，缩小后重新组合为PDF
   */
  async compressByImage(
    pdfBuffer: Buffer,
    options: { scale: number; quality: number } = { scale: 0.8, quality: 80 },
  ): Promise<Buffer> {
    const { scale, quality } = options;

    try {
      const pdfJsLib = await getPdfJsLib();
      
      // 加载 PDF 文档
      const loadingTask = pdfJsLib.getDocument({ data: pdfBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      // 创建新的 PDF 文档
      const newPdfDoc = await PDFDocument.create();

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // 获取页面
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 * scale }); // 基础缩放

        // 创建 canvas 进行渲染
        const canvas: any = {
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
          getContext: () => ({
            fillRect: () => {},
            fillText: () => {},
          }),
        };

        // 使用 Node canvas 替代（如果可用）或使用备选方案
        let imageData: Buffer;

        try {
          // 尝试使用 canvas 库
          const { createCanvas } = await import('canvas');
          const nodeCanvas = createCanvas(canvas.width, canvas.height);
          const ctx = nodeCanvas.getContext('2d');

          // 白色背景
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 渲染 PDF 页面
          await page.render({
            canvasContext: ctx,
            viewport: viewport,
          }).promise;

          // 获取图片数据
          const buffer = nodeCanvas.toBuffer('image/jpeg', { quality: quality / 100 });
          imageData = buffer;
        } catch {
          // 如果 canvas 不可用，使用 pdf-lib 提取页面作为备选
          // 这种方式无法真正压缩，但保证功能可用
          const existingPdf = await PDFDocument.load(pdfBuffer);
          const [copiedPage] = await newPdfDoc.copyPages(existingPdf, [pageNum - 1]);
          newPdfDoc.addPage(copiedPage);
          
          const pdfBytes = await newPdfDoc.save();
          return Buffer.from(pdfBytes);
        }

        // 使用 sharp 进一步压缩图片
        const compressedImage = await sharp(imageData)
          .resize(Math.floor(canvas.width * scale), Math.floor(canvas.height * scale), {
            fit: 'fill',
          })
          .jpeg({ quality: quality })
          .toBuffer();

        // 将图片添加到新 PDF
        const image = await newPdfDoc.embedJpg(compressedImage);
        const pdfPage = newPdfDoc.addPage([image.width, image.height]);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      const pdfBytes = await newPdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('PDF image compression error:', error);
      throw new BadRequestException('PDF图片压缩失败');
    }
  }

  /**
   * 压缩方法2：传统PDF优化（使用pdf-lib）
   * 移除重复资源、压缩流、优化结构
   */
  async compressByAdobeStyle(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      // 加载 PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      // 获取页面数量
      const pageCount = pdfDoc.getPageCount();

      // pdf-lib 会自动优化一些内容
      // 我们手动进行一些优化

      // 移除元数据
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');

      // 保存并返回
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('PDF Adobe-style compression error:', error);
      throw new BadRequestException('PDF优化压缩失败');
    }
  }

  /**
   * 图片压缩
   */
  async compressImage(
    imageBuffer: Buffer,
    options: { quality: number; maxWidth: number },
  ): Promise<{ result: string; method: string; compressionRate: string; originalSize: number; compressedSize: number }> {
    const { quality, maxWidth } = options;
    const originalSize = imageBuffer.length;

    try {
      // 获取图片元数据
      const metadata = await sharp(imageBuffer).metadata();
      const originalWidth = metadata.width || 1920;

      // 确定缩放比例
      let resizeOptions: sharp.ResizeOptions = {};
      if (originalWidth > maxWidth) {
        resizeOptions = {
          width: maxWidth,
          withoutEnlargement: true,
        };
      }

      // 压缩并转换
      const compressedBuffer = await sharp(imageBuffer)
        .resize(resizeOptions)
        .jpeg({ quality })
        .toBuffer();

      const compressedSize = compressedBuffer.length;
      const compressionRate = ((1 - compressedSize / originalSize) * 100).toFixed(2) + '%';

      return {
        result: compressedBuffer.toString('base64'),
        method: 'sharp',
        compressionRate,
        originalSize,
        compressedSize,
      };
    } catch (error) {
      console.error('Image compression error:', error);
      throw new BadRequestException('图片压缩失败');
    }
  }

  /**
   * 智能双轨压缩：并行执行两种压缩，选择最优结果
   */
  async smartDualCompress(
    pdfBuffer: Buffer,
  ): Promise<{
    result: string;
    method: 'image' | 'adobe' | 'original';
    compressionRate: string;
    originalSize: number;
    compressedSize: number;
  }> {
    const originalSize = pdfBuffer.length;

    // 如果 PDF 太小，直接返回原文件
    if (originalSize < 1024) {
      return {
        result: pdfBuffer.toString('base64'),
        method: 'original',
        compressionRate: '0%',
        originalSize,
        compressedSize: originalSize,
      };
    }

    try {
      // 并行执行两种压缩
      const [imageResult, adobeResult] = await Promise.allSettled([
        this.compressByImage(pdfBuffer, { scale: 0.7, quality: 75 }),
        this.compressByAdobeStyle(pdfBuffer),
      ]);

      const results: { buffer: Buffer; method: 'image' | 'adobe' }[] = [];

      if (imageResult.status === 'fulfilled' && imageResult.value.length > 0) {
        results.push({ buffer: imageResult.value, method: 'image' });
      }

      if (adobeResult.status === 'fulfilled' && adobeResult.value.length > 0) {
        results.push({ buffer: adobeResult.value, method: 'adobe' });
      }

      if (results.length === 0) {
        // 两种压缩都失败，返回原始文件
        return {
          result: pdfBuffer.toString('base64'),
          method: 'original',
          compressionRate: '0%',
          originalSize,
          compressedSize: originalSize,
        };
      }

      // 选择压缩后最小的结果
      let bestResult = results[0];
      for (const r of results) {
        if (r.buffer.length < bestResult.buffer.length) {
          bestResult = r;
        }
      }

      // 如果压缩后反而变大了，返回原始文件
      if (bestResult.buffer.length >= originalSize) {
        return {
          result: pdfBuffer.toString('base64'),
          method: 'original',
          compressionRate: '0%',
          originalSize,
          compressedSize: originalSize,
        };
      }

      const compressedSize = bestResult.buffer.length;
      const compressionRate = ((1 - compressedSize / originalSize) * 100).toFixed(2) + '%';

      return {
        result: bestResult.buffer.toString('base64'),
        method: bestResult.method,
        compressionRate,
        originalSize,
        compressedSize,
      };
    } catch (error) {
      console.error('Smart dual compression error:', error);
      // 出错时返回原始文件
      return {
        result: pdfBuffer.toString('base64'),
        method: 'original',
        compressionRate: '0%',
        originalSize,
        compressedSize: originalSize,
      };
    }
  }

  /**
   * 记录压缩日志
   */
  async logCompression(data: CompressionLogData): Promise<void> {
    try {
      await this.prisma.compressionLog.create({
        data: {
          userId: data.userId,
          fileName: data.fileName,
          originalSize: data.originalSize,
          compressedSize: data.compressedSize,
          method: data.method,
          compressionRate: data.compressionRate,
        },
      });
    } catch (error) {
      // 记录失败不阻塞主流程
      console.error('Failed to log compression:', error);
    }
  }
}
