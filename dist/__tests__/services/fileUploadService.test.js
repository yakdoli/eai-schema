import { FileUploadService } from '../../services/fileUploadService';
import { FileUploadError, SecurityError } from '../../middleware/errorHandler';
import fs from 'fs/promises';
// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../utils/logger');
const mockFs = fs;
describe('FileUploadService', () => {
    let service;
    beforeEach(() => {
        service = new FileUploadService();
        jest.clearAllMocks();
    });
    describe('validateFile', () => {
        it('유효한 XML 파일을 검증해야 함', () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.xml',
                encoding: '7bit',
                mimetype: 'application/xml',
                size: 1024,
                buffer: Buffer.from('<?xml version="1.0"?><root></root>'),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            expect(() => service.validateFile(mockFile)).not.toThrow();
        });
        it('파일 크기가 너무 클 때 에러를 발생시켜야 함', () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'large.xml',
                encoding: '7bit',
                mimetype: 'application/xml',
                size: 60 * 1024 * 1024, // 60MB
                buffer: Buffer.alloc(60 * 1024 * 1024),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            expect(() => service.validateFile(mockFile)).toThrow(FileUploadError);
            expect(() => service.validateFile(mockFile)).toThrow('파일 크기가 너무 큽니다');
        });
        it('지원되지 않는 MIME 타입일 때 에러를 발생시켜야 함', () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.exe',
                encoding: '7bit',
                mimetype: 'application/x-executable',
                size: 1024,
                buffer: Buffer.from('binary data'),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            expect(() => service.validateFile(mockFile)).toThrow(FileUploadError);
            expect(() => service.validateFile(mockFile)).toThrow('지원되지 않는 파일 타입입니다');
        });
        it('지원되지 않는 파일 확장자일 때 에러를 발생시켜야 함', () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.exe',
                encoding: '7bit',
                mimetype: 'application/xml', // MIME 타입은 유효하지만 확장자가 잘못됨
                size: 1024,
                buffer: Buffer.from('<?xml version="1.0"?><root></root>'),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            expect(() => service.validateFile(mockFile)).toThrow(FileUploadError);
            expect(() => service.validateFile(mockFile)).toThrow('지원되지 않는 파일 확장자입니다');
        });
        it('XXE 공격이 포함된 XML 파일을 거부해야 함', () => {
            const maliciousXml = `<?xml version="1.0"?>
        <!DOCTYPE root [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <root>&xxe;</root>`;
            const mockFile = {
                fieldname: 'file',
                originalname: 'malicious.xml',
                encoding: '7bit',
                mimetype: 'application/xml',
                size: maliciousXml.length,
                buffer: Buffer.from(maliciousXml),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            expect(() => service.validateFile(mockFile)).toThrow(SecurityError);
            expect(() => service.validateFile(mockFile)).toThrow('외부 엔티티 참조가 포함된 XML 파일은 허용되지 않습니다');
        });
    });
    describe('saveFile', () => {
        it('유효한 파일을 저장해야 함', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.xml',
                encoding: '7bit',
                mimetype: 'application/xml',
                size: 1024,
                buffer: Buffer.from('<?xml version="1.0"?><root></root>'),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            mockFs.writeFile.mockResolvedValue(undefined);
            const result = await service.saveFile(mockFile);
            expect(result).toMatchObject({
                originalName: 'test.xml',
                size: 1024,
                mimetype: 'application/xml'
            });
            expect(result.id).toBeDefined();
            expect(result.filename).toContain('test.xml');
            expect(mockFs.writeFile).toHaveBeenCalled();
        });
    });
    describe('readFile', () => {
        it('존재하는 파일을 읽어야 함', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.xml',
                encoding: '7bit',
                mimetype: 'application/xml',
                size: 1024,
                buffer: Buffer.from('<?xml version="1.0"?><root></root>'),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            const fileContent = Buffer.from('<?xml version="1.0"?><root></root>');
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue(fileContent);
            const fileInfo = await service.saveFile(mockFile);
            const content = await service.readFile(fileInfo.id);
            expect(content).toEqual(fileContent);
        });
        it('존재하지 않는 파일에 대해 에러를 발생시켜야 함', async () => {
            await expect(service.readFile('nonexistent-id')).rejects.toThrow('파일을 찾을 수 없습니다');
        });
    });
    describe('deleteFile', () => {
        it('파일을 삭제해야 함', async () => {
            const mockFile = {
                fieldname: 'file',
                originalname: 'test.xml',
                encoding: '7bit',
                mimetype: 'application/xml',
                size: 1024,
                buffer: Buffer.from('<?xml version="1.0"?><root></root>'),
                destination: '',
                filename: '',
                path: '',
                stream: null,
            };
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.unlink.mockResolvedValue(undefined);
            const fileInfo = await service.saveFile(mockFile);
            await service.deleteFile(fileInfo.id);
            expect(mockFs.unlink).toHaveBeenCalled();
            expect(service.getFileInfo(fileInfo.id)).toBeUndefined();
        });
    });
});
