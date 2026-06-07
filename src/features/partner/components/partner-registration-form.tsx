'use client';

import { useForm, Controller } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PartnerRegistrationSchema,
  zodResolverCompat,
  type PartnerRegistrationFormValues,
} from '@/shared/validators/partner-registration.validator';
import { useSubmitPartnerRegistration } from '../hooks/useSubmitPartnerRegistration';
import type { PartnerRegistrationRequest } from '../types/partner.interface';

function fileToUrl(file: File): string {
  return `/uploads/${file.name}`;
}

function toRequest(values: PartnerRegistrationFormValues): PartnerRegistrationRequest {
  const licenseFile = values.basicInfo.businessLicenseImage?.item(0);
  const spaceFiles = values.infrastructure.spaceImages
    ? Array.from(values.infrastructure.spaceImages)
    : [];

  if (!licenseFile) {
    throw new Error('Vui lòng tải lên ảnh giấy phép kinh doanh.');
  }

  return {
    basicInfo: {
      cafeName: values.basicInfo.cafeName,
      address: values.basicInfo.address,
      hotline: values.basicInfo.hotline,
      representativeEmail: values.basicInfo.representativeEmail,
      businessLicense: values.basicInfo.businessLicense,
      businessLicenseImage: fileToUrl(licenseFile),
    },
    infrastructure: {
      numberOfTables: values.infrastructure.numberOfTables,
      numberOfPrivateRooms: values.infrastructure.numberOfPrivateRooms,
      maximumCapacity: values.infrastructure.maximumCapacity,
      spaceImages: spaceFiles.map(fileToUrl),
    },
    boardGameCatalog: values.boardGameCatalog,
    additionalServices: values.additionalServices,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function PartnerRegistrationForm() {
  const { mutate: submit, isPending, isSuccess } = useSubmitPartnerRegistration();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerRegistrationFormValues>({
    resolver: zodResolverCompat(PartnerRegistrationSchema),
    defaultValues: {
      basicInfo: {
        cafeName: '',
        address: '',
        hotline: '',
        representativeEmail: '',
        businessLicense: '',
      },
      infrastructure: {
        numberOfTables: 1,
        numberOfPrivateRooms: 0,
        maximumCapacity: 10,
      },
      boardGameCatalog: {
        numberOfGamesOwned: 1,
        listOfPopularGames: '',
      },
      additionalServices: {
        hasGameMaster: false,
        billingModel: 'BY_HOUR',
      },
    },
  });

  const onSubmit = (values: PartnerRegistrationFormValues) => {
    submit(toRequest(values));
  };

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đã gửi đơn đăng ký</CardTitle>
          <CardDescription>
            Cảm ơn bạn đã đăng ký trở thành đối tác BoardVerse. Đội ngũ Ops sẽ liên hệ
            qua email đại diện trong 3–5 ngày làm việc.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Khối 1 — Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="cafeName">Tên quán *</Label>
            <Input id="cafeName" {...register('basicInfo.cafeName')} />
            <FieldError message={errors.basicInfo?.cafeName?.message} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="address">Địa chỉ chính xác *</Label>
            <Textarea id="address" rows={2} {...register('basicInfo.address')} />
            <FieldError message={errors.basicInfo?.address?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hotline">Hotline *</Label>
            <Input id="hotline" placeholder="0901234567" {...register('basicInfo.hotline')} />
            <FieldError message={errors.basicInfo?.hotline?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email đại diện *</Label>
            <Input id="email" type="email" {...register('basicInfo.representativeEmail')} />
            <FieldError message={errors.basicInfo?.representativeEmail?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="license">Mã số thuế / Giấy phép KD *</Label>
            <Input id="license" {...register('basicInfo.businessLicense')} />
            <FieldError message={errors.basicInfo?.businessLicense?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="licenseImage">Ảnh giấy phép (JPEG/PNG/PDF, ≤5MB) *</Label>
            <Input
              id="licenseImage"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              {...register('basicInfo.businessLicenseImage')}
            />
            <FieldError message={errors.basicInfo?.businessLicenseImage?.message as string} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Khối 2 — Năng lực hạ tầng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="tables">Số bàn chơi công cộng *</Label>
            <Input id="tables" type="number" min={1} {...register('infrastructure.numberOfTables')} />
            <FieldError message={errors.infrastructure?.numberOfTables?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rooms">Số phòng riêng</Label>
            <Input id="rooms" type="number" min={0} {...register('infrastructure.numberOfPrivateRooms')} />
            <FieldError message={errors.infrastructure?.numberOfPrivateRooms?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capacity">Sức chứa tối đa *</Label>
            <Input id="capacity" type="number" min={1} {...register('infrastructure.maximumCapacity')} />
            <FieldError message={errors.infrastructure?.maximumCapacity?.message} />
          </div>
          <div className="grid gap-2 sm:col-span-3">
            <Label htmlFor="spaceImages">Ảnh không gian (tối thiểu 3 ảnh JPEG/PNG) *</Label>
            <Input
              id="spaceImages"
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              {...register('infrastructure.spaceImages')}
            />
            <FieldError message={errors.infrastructure?.spaceImages?.message as string} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Khối 3 — Danh mục Board Game</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="gamesOwned">Tổng số bộ game sở hữu *</Label>
            <Input id="gamesOwned" type="number" min={1} {...register('boardGameCatalog.numberOfGamesOwned')} />
            <FieldError message={errors.boardGameCatalog?.numberOfGamesOwned?.message} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="popularGames">Danh sách game phổ biến *</Label>
            <Textarea
              id="popularGames"
              rows={3}
              placeholder="Catan, Wingspan, Ticket to Ride..."
              {...register('boardGameCatalog.listOfPopularGames')}
            />
            <FieldError message={errors.boardGameCatalog?.listOfPopularGames?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Khối 4 — Dịch vụ & Mô hình vận hành</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Có Game Master hướng dẫn luật?</Label>
              <p className="text-sm text-muted-foreground">Nhân viên biết giải thích luật chơi</p>
            </div>
            <Controller
              name="additionalServices.hasGameMaster"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>Mô hình tính phí *</Label>
            <Controller
              name="additionalServices.billingModel"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mô hình" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BY_HOUR">Theo giờ chơi (BY_HOUR)</SelectItem>
                    <SelectItem value="PER_DRINK">Theo menu đồ uống (PER_DRINK)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.additionalServices?.billingModel?.message} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang gửi...
          </>
        ) : (
          'Gửi đăng ký đối tác'
        )}
      </Button>
    </form>
  );
}
