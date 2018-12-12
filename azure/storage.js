import {
  Aborter,
  BlobURL,
  BlockBlobURL,
  ShareURL,
  DirectoryURL,
  FileURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
  SharedKeyCredential,
  AnonymousCredential,
  TokenCredential,
} from '@azure/storage-file';

export const defaultAzureProps = {
  account: 'devstoreaccount1',
  accountKey: process.env.REACTORY_AZURE_ACCOUNTKEY,
  storageUrl: undefined,
};

class AzureBlobStorage {
  constructor(props = defaultAzureProps, context) {
    const { account, accountKey, storageUrl } = props;
    // Use SharedKeyCredential with storage account and account key
    const sharedKeyCredential = new SharedKeyCredential(account, accountKey);
    this.context = context;
    // Use AnonymousCredential when url already includes a SAS signature
    this.anonymousCredential = new AnonymousCredential();

    this.pipeline = StorageURL.newPipeline(sharedKeyCredential);

    // List containers
    this.storageURL = account === 'devstoreaccount1' ? `http://127.0.0.1:10000/${account}/` : (storageUrl || `https://${account}.blob.core.windows.net/`);
    this.serviceURL = new ServiceURL(this.storageURL, this.pipeline);

    this.mkdirSync = this.mkdir.bind(this);
    this.ls = this.ls.bind(this);
    this.writeFileSync = this.writeFile.bind(this);
  }

  async mkdir(path) {
    const shareURL = ShareURL.fromServiceURL(this.serviceURL, '/');
    const directoryURL = DirectoryURL.fromShareURL(shareURL, path);
    await directoryURL.create(Aborter.none);
    console.log(`share ${path} created successfully`);
    return true;
  }

  async writeFile(path, fileName, content) {
    const fileURL = FileURL.fromDirectoryURL(path, fileName);
    await fileURL.create(Aborter.none, content.length);
    console.log(`Upload block blob ${fileName} successfully`);
  }

  async ls(path = '/') {
    let marker;
    const folders = [];
    do {
      const listSharesResponse = await this.serviceURL.listSharesSegment(
        Aborter.none,
        marker,
      );

      marker = listSharesResponse.nextMarker;
      for (let si = 0; si <= listSharesResponse.shareItems.length; si += 1) {
        const share = listSharesResponse.shareItems[si];
        console.log(`\tShare: ${share.name}`, share);
        folders.push(share.name);
      }
    } while (marker);

    return folders;
  }

  async listFiles(path) {
    let marker;
    const containerURL = ContainerURL.fromServiceURL(this.serviceURL, path);
    const files = [];
    do {
      const listBlobsResponse = await containerURL.listBlobFlatSegment(
        Aborter.none,
        marker,
      );

      marker = listBlobsResponse.nextMarker;

      for (let bi = 0; bi <= listBlobsResponse.segment.blobItems.length; bi += 1) {
        const blob = listBlobsResponse.segment.blobItems[bi];
        console.log(`Blob: ${blob.name}`);
        files.push(blob);
      }
    } while (marker);

    return files;
  }
}

export default AzureBlobStorage;
