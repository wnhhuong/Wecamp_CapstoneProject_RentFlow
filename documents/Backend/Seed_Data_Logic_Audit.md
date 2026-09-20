# RentFlow Seed Data Logic Audit

## 1. Muc dich va pham vi

Tai lieu nay tong hop cac van de logic cua development seed trong
`backend/src/seed.ts`, doi chieu voi:

- Mongoose models trong `backend/src/models`.
- Flow nghiep vu dang duoc backend implement.
- `documents/Backend/Backend_API_Spec.md`.
- `Backend_Seed_Brief.md` do team cung cap ngay 20/09/2026.

Day la static audit. Khong chay `npm run seed -- --reset`, vi lenh nay xoa toan bo
du lieu trong database duoc cau hinh boi `MONGO_URI`.

## 2. Ket luan ngan

Seed hien tai build duoc, dung ObjectId that, hash password va co guard `--reset`.
Tuy nhien, no chua phai bo du lieu nghiep vu nhat quan de test end-to-end.

Nhung nhom van de chinh:

1. Room va Room Account khong bao toan quan he 1-1.
2. Request, Consumption va Invoice duoc seed roi rac, khong theo dung lifecycle.
3. Co cac trang thai Request/Invoice mau thuan truc tiep.
4. Chuoi Move-out -> Checkout bi vi pham.
5. Phi, chi so dien va invoice snapshot khong khop logic tao invoice hien tai.
6. Anh va chu ky ma seed tham chieu khong ton tai tren dia.
7. Seed khong phu du 6 loai Request va cac trang thai can cho UI.
8. Ngay co dinh se som lam active contract va du lieu demo bi loi thoi.

## 3. Inventory cua seed hien tai

Seed tu cong bo cac so luong sau:

| Entity | So luong |
|---|---:|
| Area | 3 |
| Room | 10 |
| User | 8 |
| Contract | 8 (4 active, 4 historical) |
| Consumption | 105 |
| Invoice | 105 |
| Request | 5 |
| Ticket | 6 |

Phan tich request hien tai:

| Request type | Pending | Approved | Tong |
|---|---:|---:|---:|
| `consump` | 0 | 0 | 0 |
| `delay` | 1 | 0 | 1 |
| `paid` | 1 | 1 | 2 |
| `extend` | 0 | 0 | 0 |
| `moveout` | 0 | 1 | 1 |
| `checkout` | 0 | 1 | 1 |

Invoice hien tai gom 100 invoice `paid` va 5 invoice `not_paid`. Chi co mot
`PAID Request` approved va mot `PAID Request` pending.

## 4. Flow nghiep vu dung can duoc seed phan anh

### 4.1 Consumption va Invoice

Flow hien tai cua backend:

```text
Tenant gui CONSUMP Request trong reading window
  -> Request PENDING, chua co Consumption/Invoice

Admin approve
  -> Request APPROVED + resolveDate
  -> tao Consumption
  -> tinh usage = currentReading - previousReading
  -> tao Invoice NOT_PAID ngay trong cung transaction
```

Moi Invoice bat buoc tham chieu mot Consumption. Voi du lieu sinh ra boi flow hien
tai, Invoice cung phai co nguon goc tu mot `CONSUMP Request` approved. Schema khong
luu truc tiep `requestID` tren Invoice, nen quan he nay duoc suy ra qua room,
reading va `trackingTime`.

Du lieu historical/legacy co the khong co Request neu da import tu he thong cu.
Neu dung cach nay, seed phai danh dau ro du lieu nao la legacy va van can mot nhom
du lieu moi co day du chuoi Request -> Consumption -> Invoice de test flow hien tai.

### 4.2 Payment

```text
Invoice NOT_PAID
  -> Tenant gui PAID Request
  -> PAID Request PENDING, Invoice van NOT_PAID
  -> Admin approve
  -> Request APPROVED + Invoice PAID + paymentDate
```

Khong phai moi Invoice deu bat buoc co PAID Request:

- Invoice `not_paid` co the chua co payment request.
- Invoice `not_paid` co the co `PAID Request pending`.
- Invoice `paid` tao theo flow hien tai nen co `PAID Request approved`.
- Invoice legacy co the khong co Request, nhung can duoc phan loai ro.

### 4.3 Late payment

```text
Invoice NOT_PAID, isRequestLate=false
  -> LATE_PAYMENT Request PENDING
  -> Admin approve
  -> Request APPROVED + isRequestLate=true
  -> dueDate va Invoice.status khong thay doi
```

### 4.4 Move-out va Checkout

```text
MOVEOUT PENDING
  -> approve
  -> MOVEOUT APPROVED
  -> Contract van ACTIVE
  -> Room RENTED -> AVAILABLE_SOON

Sau do moi duoc tao CHECKOUT PENDING
  -> approve
  -> CHECKOUT APPROVED
  -> Contract ACTIVE -> EXPIRED
  -> Room AVAILABLE_SOON -> AVAILABLE_NOW
  -> Account -> BANNED
```

## 5. Cac loi logic chac chan

### SD-01 - Ba Room khong co Room Account

**Muc do:** Cao

Seed tao 10 Room nhung chi tao Room Account cho 7 phong. Ba phong thieu Account:

- `A-201`
- `A-301`
- `B-202`

Dieu nay trai voi flow `createRoomWithAccount`: moi Room moi duoc tao cung mot
Account role `user`, username bang room code va status ban dau la `banned`.

**Anh huong:**

- Admin Room list/detail tra `account: null` cho cac phong nay.
- Khong the chay flow prepare Room Account.
- Khong test duoc quy tac chi Account `banned` moi duoc prepare.
- Seed khong dai dien cho du lieu ma API Create Room thuc su tao ra.

**Can sua:** Tao Account `banned` cho moi Room chua co account. Moi Room chi co mot
Room Account.

### SD-02 - 105 Invoice khong co CONSUMP Request nguon

**Muc do:** Cao

Seed tao truc tiep 105 Consumption va 105 Invoice, nhung khong tao bat ky parent
Request type `consump` hay document `ConsumpRequest` nao.

Day khong vi pham foreign key cua MongoDB, vi Invoice chi yeu cau `consumptionID`.
Tuy nhien, no khong phan anh flow hien tai trong do Admin approve Consumption
Request va backend tao Consumption + Invoice trong cung transaction.

**Anh huong:**

- Khong test duoc Admin Consumption approval detail/action.
- Khong test duoc meter image, previous reading, current reading va usage truoc approve.
- Khong test duoc lien ket "View invoice" sau khi approve.
- Khong test duoc duplicate billing-period guard.
- Admin Requests page gan nhu khong co du lieu dien.

**Can sua:** Khong nhat thiet tao Request cho toan bo invoice legacy. Can it nhat:

- Mot `CONSUMP PENDING` chua co Consumption/Invoice.
- Mot `CONSUMP APPROVED` co Consumption va Invoice `not_paid`.
- Mot request trong cung billing period de kiem thu duplicate guard neu co test rieng.

### SD-03 - Gan nhu moi Invoice PAID khong co PAID Request approved

**Muc do:** Cao doi voi du lieu dai dien flow hien tai

Seed co 100 Invoice `paid`, nhung chi co mot `PAID Request approved`. Nhu vay co
99 Invoice paid khong co payment-confirmation history trong seed.

Du lieu historical import co the khong co Request, nhung seed khong phan biet ro
legacy invoice va invoice duoc xu ly theo RentFlow.

**Anh huong:**

- Khong the dung seed de kiem chung quy tac "chi Admin confirm moi chuyen PAID".
- Request history va Invoice history khong giai thich duoc lan nhau.
- Dashboard co nhieu invoice paid nhung Admin Requests gan nhu trong.

**Can sua:** Danh dau phan invoice cu la legacy trong code/comment; voi cac invoice
dai dien flow hien tai, tao `PAID Request approved` co `createDate`, `resolveDate`
va `paymentDate` theo dung thu tu.

### SD-04 - Late-payment Request PENDING nhung Invoice da isRequestLate=true

**Muc do:** Cao

Invoice `A-101-aug` duoc seed voi `isRequestLate=true`, trong khi request
`late-A-101` van la `pending`.

Theo backend hien tai, `isRequestLate` chi duoc set thanh `true` khi Admin approve
request. Request pending phai de invoice `isRequestLate=false`.

**Anh huong:** UI hien thi invoice da duoc chap nhan tra tre trong khi Admin van
thay request can approve.

**Can sua:** Chon mot trong hai bo trang thai:

- Request `pending`, `resolveDate=null`, invoice `isRequestLate=false`; hoac
- Request `approved`, co `resolveDate`, invoice `isRequestLate=true`.

### SD-05 - Checkout approved khong co Move-out approved cho cung Contract

**Muc do:** Nghiem trong

Seed tao `checkout-old-C-301` approved cho contract `C-301-old`, nhung Move-out
approved duy nhat lai thuoc `B-101-old`.

Backend bat buoc tim thay MoveoutRequest cua dung contract va parent Request phai
approved truoc khi approve checkout.

**Anh huong:** Record checkout nay khong the duoc tao ra boi flow that. No lam sai
lifecycle Room/Contract/Account va khong dung de test nghiep vu.

**Can sua:** Tao chuoi day du tren cung mot contract:

1. Move-out request approved.
2. Room o `available_soon`, Contract van `active` tai thoi diem do.
3. Checkout request duoc tao sau Move-out approval.
4. Checkout approved.
5. Contract `expired`, Room `available_now`, Account `banned`.

Neu muon giu `moveout-old-B-101`, can them checkout ket thuc tenancy B-101 truoc
khi tao current contract cho tenant moi.

### SD-06 - Paid Request duoc tao truoc Invoice

**Muc do:** Cao

`paid-old-A-101` co `createDate=2024-06-30`, trong khi invoice lien quan
`A-101-old-jun` co `createdDate=2024-07-01`.

Tenant khong the gui payment notification cho invoice chua ton tai.

**Can sua:** Dam bao thu tu:

```text
invoice.createdDate <= paidRequest.createDate <= paidRequest.resolveDate
invoice.paymentDate == hoac gan paidRequest.resolveDate
```

### SD-07 - Invoice seed van phan anh flow tao hoa don ngay 01

**Muc do:** Cao

Consumption thang 08/2026 co `trackingTime` ngay 28/08, nhung invoice tuong ung co
`createdDate` ngay 01/09. Generated history cung tao invoice vao ngay 01 cua thang
sau.

Flow backend hien tai tao Invoice ngay trong luc Admin approve Consumption Request,
khong cho billing job ngay 01.

Can phan biet ba moc:

- `Consumption.trackingTime`: billing period va luc chup/giao chi so.
- `Invoice.createdDate`: luc Admin approve va Invoice duoc tao.
- `Invoice.dueDate`: ngay 05 cua thang sau theo flow da chot.

**Can sua:** Voi du lieu dai dien flow hien tai, dat `createdDate` tai thoi diem
approve (thuong ngay 25-30), khong tu dong day sang ngay 01. Du lieu legacy neu giu
flow cu phai duoc ghi chu ro.

### SD-08 - Chi so dien sinh ra khong thuc te va co ky usage bang 0

**Muc do:** Trung binh/Cao

Seed noi suy reading tren khoang gan hai nam nhung tong chi tang vai chuc kWh. Vi
lam tron tung thang, nhieu ky chi tang 0-1 kWh. Invoice hien thi tien dien 0,
3.500 hoac 7.000 dong ben canh tien phong 3-4 trieu.

Muc tham chieu team da ghi nhan la khoang 120-200 kWh/thang. Vi du A-101 tu 148
len 300 la 152 kWh, tien dien 532.000 dong voi don gia 3.500.

**Anh huong:** Dashboard va Invoice UI co du lieu phi thuc te; khong test duoc
format, ty trong chi phi va tinh toan thong thuong.

**Can sua:** Sinh reading luy tien tu baseline, moi thang cong mot usage duong va
hop ly. Assert `currentReading > previousReading` cho moi ky demo binh thuong.

### SD-09 - Phi tren Invoice khong khop Parameter

**Muc do:** Cao

Parameter seed:

- `waterPrice=15000`
- `wifiFee=100000`
- `parkingFee=70000`
- `otherFees=30000`

Nhung invoice seed dung:

- water 125.000-175.000
- parking 0-150.000
- other fee co noi bang 0

Service tao invoice hien tai doc cac phi truc tiep tu Parameter va ap dung gia tri
do vao invoice moi. Vi vay, invoice tao that sau reset nam ngay canh invoice seed
nhung co breakdown khac han.

**Can sua:** Sinh invoice thong qua cung helper/service cua ung dung hoac doc gia
tri tu Parameter vua seed. Khong hardcode lai cac phi tai nhieu noi.

Neu business muon phi theo tung phong/so nguoi, model va service hien tai chua luu
du thong tin do; team can chot va doi model truoc khi seed theo cach nay.

### SD-10 - Tat ca Invoice seed thieu electricityUnitPrice snapshot

**Muc do:** Trung binh/Cao

Field `Invoice.electricityUnitPrice` duoc them de giu don gia dien tai thoi diem tao
invoice. Toan bo 105 invoice seed khong set field nay, nen API phai roi vao nhanh
suy nguoc legacy `electricalBill / usage` hoac dung gia hien tai lam gia tham khao.

**Anh huong:** Khong test duoc snapshot moi va co the hien thi "approximate" khong
can thiet.

**Can sua:** Tat ca invoice moi sinh theo flow hien tai phai co
`electricityUnitPrice`. Chi invoice co chu dich danh dau legacy moi duoc thieu.

### SD-11 - File anh va chu ky seed khong ton tai

**Muc do:** Cao doi voi FE/demo

Static audit tim thay 63 duong dan asset tinh trong seed va khong co file nao ton
tai. Ngoai ra, khoang 95 duong dan consumption duoc sinh dong cung khong co file.

Nhom bi anh huong:

- Room images.
- Consumption meter images.
- Checkout final image.
- Repair images.
- Contract signatures.

**Anh huong:** UI hien broken image; khong the review meter/checkout evidence; demo
Room catalogue va detail khong dung.

**Can sua:** Them bo asset demo that vao `backend/uploads`, hoac copy mot bo anh
fixture nho va tai su dung co chu dich. FE van nen giu `onError`, nhung seed khong
nen phu thuoc hoan toan vao fallback.

### SD-12 - First reading cua tenancy moi co the gom usage cua tenancy cu

**Muc do:** Cao

Mot so phong thieu reading chot sat ngay tenant cu ket thuc:

- A-102 dung baseline thang 06 nhung tenancy moi bat dau thang 09.
- B-101 dung baseline thang 06 nhung tenancy moi bat dau thang 08.
- C-301 dung baseline thang 05 nhung tenancy moi bat dau thang 07.

Khi invoice dau tien cua tenant moi lay Consumption gan nhat cua Room, usage co the
bao gom phan dien cua tenant cu hoac cac thang bi bo trong.

Rieng C-301, checkout cu co final reading 166 nhung reading dau cua tenancy moi
duoc noi suy thap hon 166. Day la meter regression ve mat nghiep vu.

**Can sua:** Moi tenancy can co baseline/chot cong to tai handover. Reading dau tien
cua tenant moi phai lon hon hoac bang final reading cua tenant cu va chi tinh phan
usage thuoc tenancy moi.

### SD-13 - Property parameters va contract template mau thuan

**Muc do:** Trung binh

Parameter cong khai khai bao:

- Property name: `RentFlow Residence`.
- Address: `12 Nguyen Trai, Thanh Xuan, Ha Noi`.

Contract template lai hardcode `Nha tro Binh An, 128 Duong so 7, Thu Duc`.

**Anh huong:** Guest/Admin Property va hop dong dien tu hien hai co so khac nhau.

**Can sua:** Contract template phai dung cung ten/dia chi, hoac render token
`{propertyName}` va `{address}` tu Parameter thay vi hardcode.

### SD-14 - Active Contract dung ngay co dinh va sap thanh du lieu sai

**Muc do:** Trung binh

Bon active contract het han vao 01/10/2026 hoac 05/10/2026. Seed van gan status
`active` va Room `rented` ma khong tu dong danh gia lai theo ngay chay seed.

Sau cac moc tren, reset DB se tao contract da het han theo ngay nhung status van
active.

**Can sua:** Dung mot `seedNow` co dinh cho test snapshot, hoac sinh ngay tuong doi
so voi ngay chay. Cuoi seed assert moi active contract co `expireDate > now`.

### SD-15 - Current Ticket mang moc 2024 trong bo du lieu van hanh 2026

**Muc do:** Thap/Trung binh

Ticket duoc coi la current (`need_action`, `in_progress`) co createDate nam 2024,
trong khi invoice/request demo chinh nam 2026. Chung van co the hien thi vi sau
Account.startDate, nhung lam dashboard co ticket ton dong hai nam va flow demo
khong tu nhien.

**Can sua:** Giu mot so ticket historical ro rang, nhung tao them ticket current
gan `seedNow` cho dashboard va lifecycle action.

### SD-16 - Thieu coverage cho 6 loai Request va cac trang thai UI

**Muc do:** Cao doi voi QA

Seed khong co `consump` va `extend`; `moveout`/`checkout` chi co du lieu historical
khong hop le; khong co current pending record cho cac action nay.

**Anh huong:** Khong the smoke-test day du Admin Requests, Tenant Requests, detail
drawer, approve action va status labels sau mot lan seed.

**Can sua:** Seed it nhat mot bo du lieu hop le cho tung type va co ca pending lẫn
approved khi trang thai do co y nghia.

## 6. Thieu coverage, khong nhat thiet la loi domain

### SC-01 - Khong du record de test pagination lon

Users va Tickets deu it hon page size 20. Seed khong kiem thu duoc chuyen trang,
last page, empty page sau filter va giu filter khi doi page.

Team can chot seed nhe 10 phong hay seed demo/QA lon hon 20 record. Khong nen tang
du lieu chi de tang so luong neu no lam seed kho doc; co the tach `seed:dev` va
`seed:qa`.

### SC-02 - Khong co bankQrImage

Day la chu dich dung, khong phai loi. `Parameter.value` required va endpoint upload
se upsert `bankQrImage`. Tuy nhien sau moi reset, Payment UI chi co placeholder cho
den khi Admin upload lai QR.

Neu can demo ngay sau seed, co the them mot QR fixture that va seed path hop le;
neu khong, checklist sau seed phai noi ro buoc upload.

### SC-03 - Credential demo chua duoc mo ta day du

Console chi noi `A-101 / Tenant@123`, trong khi co account `inactive` dung
`Temp@123` va account `banned` de test prepare flow.

Nen in ro cac account test theo muc dich:

- Admin active.
- Tenant active.
- Tenant inactive/first-login.
- Room account banned/prepare.

Khong in hash va khong dung credential seed o production.

## 7. Loi Backend phat hien trong luc doi chieu seed

Nhung loi sau khong nam trong `seed.ts`, nhung lam ket qua doc seed sai.

### BE-01 - Admin Room list join sai `consumptionID`

Aggregation dung `localField: 'comsumptionID'` thay vi `consumptionID`. Vi do lookup
Consumption cua Invoice khong match va `stillOwed` co the luon bang 0.

### BE-02 - Admin Room detail query field Invoice khong ton tai

Room detail goi `Invoice.find({ roomID: room._id })`, nhung Invoice schema chi co
`consumptionID`, khong co `roomID`.

Can join `Invoice.consumptionID -> Consumption.roomID`, giong quan he du lieu that.

Hai loi nay phai duoc sua rieng voi seed; sua seed khong the lam `stillOwed` dung.

## 8. Diem can lead xac nhan

1. Water la flat fee toan property, theo nguoi, hay theo phong?
2. Parking fee ap dung cho moi invoice hay chi tenant dang ky gui xe?
3. Other fee ap dung toan bo hay theo tung tenancy?
4. Co can luu payment/request history cho moi historical invoice, hay cho phep
   danh dau legacy import?
5. Seed mac dinh can nhe de dev hay du lon de test pagination?
6. Co tao Invoice ngay khi approve Consumption nhu code hien tai, hay co billing
   job ngay 01? Code va flow da chot hien tai dang theo phuong an tao ngay.

## 9. Bo du lieu toi thieu de test dung flow

Nen co cac persona/scenario sau:

| Scenario | Du lieu mong doi |
|---|---|
| Room moi | Room available_now + Account banned, chua co User/Contract |
| Account prepared | Room available_now + Account inactive |
| Tenant active | Room rented + Account active + active Contract |
| Consumption pending | Request/ConsumpRequest pending, chua co Consumption/Invoice |
| Consumption approved | Request approved + Consumption + Invoice not_paid |
| Payment pending | Invoice not_paid + PAID Request pending |
| Payment approved | Invoice paid + PAID Request approved + paymentDate |
| Late payment pending | Invoice not_paid/isRequestLate=false + DELAY pending |
| Late payment approved | Invoice not_paid/isRequestLate=true + DELAY approved |
| Extension pending | Active Contract + EXTEND pending |
| Extension approved | EXTEND approved + expireDate da tang dung parameter |
| Move-out pending | Room rented + active Contract + MOVEOUT pending |
| Move-out approved | Room available_soon + active Contract + MOVEOUT approved |
| Checkout pending | Move-out approved + CHECKOUT pending |
| Checkout approved | Contract expired + Room available_now + Account banned |

## 10. Cach sua seed de tranh tai phat

### 10.1 Tao du lieu tu source of truth

- Luu Parameters vua seed vao map.
- Sinh invoice tu Parameter map hoac dung helper production phu hop.
- Sinh reading bang usage theo thang, khong noi suy va lam tron tren khoang dai.
- Tao request parent va detail child cung mot helper/transaction.
- Tao lifecycle scenario theo tung tenancy thay vi tung collection rieng le.

### 10.2 Khong tai su dung helper co timestamp an trong khi can deterministic seed

`buildInvoiceForConsumption` dung `new Date()` cho `createdDate`. Neu seed can ket
qua lap lai duoc, nen tach pure calculator/factory nhan `createdDate` lam input,
roi production va seed cung goi factory do.

### 10.3 Them assert cuoi seed

Seed phai fail neu co bat nhat quan. Toi thieu assert:

- Moi Room co dung mot Room Account.
- Room rented co active Contract va Account active.
- Room khong rented khong co active Contract, tru truong hop onboarding duoc mo ta ro.
- Moi child Request co parent dung type; moi parent demo co dung child record.
- Request approved co `resolveDate`; pending khong co `resolveDate`.
- Late-payment pending khong duoc co `isRequestLate=true`.
- Paid Request pending khong duoc tro toi Invoice paid.
- Paid Request approved tro toi Invoice paid va co paymentDate.
- Checkout chi ton tai sau Move-out approved cua cung Contract.
- Moi Invoice co Consumption hop le.
- Moi Invoice non-legacy co `electricityUnitPrice`.
- `electricalBill == usage * electricityUnitPrice`.
- `totalBill == roomBill + electricalBill + waterBill + wifiBill + parkingBill + otherBill`.
- Consumption reading tang don dieu theo Room va trackingTime.
- Reading dau tenancy moi khong nho hon final/baseline reading cua tenancy truoc.
- Tat ca active Contract co `expireDate > seedNow`.
- Tat ca asset path duoc seed phai ton tai tren dia.
- Co du 6 RequestType.
- Moi TicketType co du trang thai can demo, neu QA yeu cau.

## 11. Thu tu sua de giam rui ro

1. Sua hai bug `stillOwed` trong Room service.
2. Tao Account cho tat ca Room.
3. Dinh nghia helper/factory tao Consumption + Invoice + Request nhat quan.
4. Sinh lai reading va invoice fee tu Parameter.
5. Tao bo 6 Request type theo lifecycle hop le.
6. Sua chuoi Move-out/Checkout va payment chronology.
7. Them asset fixtures.
8. Dong bo contract template voi property parameters.
9. Them assert cuoi seed.
10. Chay seed tren database development rieng, sau do smoke-test toan bo Guest,
    Tenant va Admin flows.

## 12. Cac diem seed dang lam dung

- Bat buoc `--reset`, giam nguy co xoa nham database.
- Xoa child collections truoc parent collections.
- Khong hardcode MongoDB `_id`; dung ObjectId do Mongoose tao.
- Password duoc bcrypt hash, khong luu plaintext.
- Co historical Contract/Consumption/Invoice thay vi hard-delete.
- `bankQrImage` khong seed chuoi rong, phu hop Mongoose required validation.
- Room price va Contract rentPrice duoc tach, ho tro quy tac doi Room.price khong
  hoi to Contract cu.
- Co cac trang thai Room, Account, Invoice va Ticket khac nhau de test UI co ban.
