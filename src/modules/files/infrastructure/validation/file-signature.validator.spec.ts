import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { FilesException } from '../../application/files.exception.js';
import { FileSignatureValidator } from './file-signature.validator.js';

describe('FileSignatureValidator', () => {
  let validator: FileSignatureValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileSignatureValidator],
    }).compile();

    validator = module.get<FileSignatureValidator>(FileSignatureValidator);
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  it('should validate valid PNG', async () => {
    const buffer = Buffer.from('89504e470d0a1a0a', 'hex');
    const stream = Readable.from(buffer);
    await expect(
      validator.validate(stream, 'test.png', 'image/png'),
    ).resolves.not.toThrow();
  });

  it('should validate valid JPG', async () => {
    const buffer = Buffer.from('ffd8ffe0', 'hex');
    const stream = Readable.from(buffer);
    await expect(
      validator.validate(stream, 'test.jpg', 'image/jpeg'),
    ).resolves.not.toThrow();
  });

  it('should reject spoofed file (PNG content, .jpg extension)', async () => {
    const buffer = Buffer.from('89504e47', 'hex'); // PNG signature
    const stream = Readable.from(buffer);
    await expect(
      validator.validate(stream, 'spoofed.jpg', 'image/jpeg'),
    ).rejects.toThrow(FilesException);
  });

  it('should restore stream after validation', async () => {
    const head = Buffer.from('ffd8ffe0', 'hex');
    const tail = Buffer.from('somepayload');
    const content = head.toString('hex') + tail.toString('hex');

    // Create stream with distinct chunks to ensure read() splits cleanly in test
    const stream = Readable.from([head, tail]);

    await validator.validate(stream, 'test.jpg', 'image/jpeg');

    // Read stream to verify content is still there
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const fullContent = Buffer.concat(chunks).toString('hex');
    expect(fullContent).toBe(content);
  });
});
