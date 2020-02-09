import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Select, Button, Col, Row, Modal } from 'antd';
import { ChromePicker } from 'react-color';
// import Canvas2Image from '../../utils/canvas2image';

function loadImage(url: string):Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    // const img = document.getElementById('img');
    img.onload = () => {
      res(img);
    }
    img.src = url;
    // img.crossorigin = "";
  })
}

function getBase64(img: File): Promise<string | null> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => res(reader.result + ''));
    reader.readAsDataURL(img);
  })
}

interface RGB{
  r: number, // 255
  g: number,
  b: number,
  a: number, // 1
}

function rgb2arr(rgb: RGB, aType = 1): number[] {
  let {r, g, b, a} = rgb;
  if (aType === 255) {
    a = a * 255;
  }
  return [r, g, b, a];
}

enum DIR {
  TOP,
  RIGHT,
  BOTTOM,
  LEFT,
}

function stroke(this: Uint8ClampedArray, start: number, surround: boolean[], rgb: RGB, unitSize: number, size: number, borderWidth: number) {
  const [t, r ,b , l] = surround;
  const borderColor = rgb2arr(rgb, 255);
  // const borderColor = [22,43,222, 255];


  // for (let i = 0; i < unitSize; i++) {
  //   for (let j = 0; j < 4; j++) {
  //     // if (t) this[start + (4 * i) + j] = borderColor[j];
  //     // if (r) this[start + (4 * size * i) + (4 * (unitSize)) + j] = borderColor[j];
  //     // if (b) this[start + (4 * (unitSize) * size) + 4 * (unitSize - i) + j] = borderColor[j];
  //     // if (l) this[start + (4 * (unitSize - i) * size) + j] = borderColor[j];
  //     if (t) strokeBorder.call(this, DIR.TOP, start + (4 * i) + j, borderColor[j], size, borderWidth);
  //     if (r) strokeBorder.call(this, DIR.RIGHT, start + (4 * size * i) + (4 * (unitSize)) + j, borderColor[j], size, borderWidth);
  //     if (b) strokeBorder.call(this, DIR.BOTTOM, start + (4 * (unitSize) * size) + 4 * (unitSize - i) + j, borderColor[j], size, borderWidth);
  //     if (l) strokeBorder.call(this, DIR.LEFT, start + (4 * (unitSize - i) * size) + j, borderColor[j], size, borderWidth);
  //   }
  // }

  if (t) {
    for (let i = 0; i < (r ? (unitSize + borderWidth) : unitSize); i++) {
      strokeBorder.call(this, DIR.TOP, start + (4 * i), borderColor, size, borderWidth);
    }
  }
  if (r) {
    for (let i = 0; i < (b ? (unitSize + borderWidth) : unitSize); i++) {
      strokeBorder.call(this, DIR.RIGHT, start + (4 * size * i) + (4 * (unitSize)), borderColor, size, borderWidth);
    }
  }
  if (b) {
    for (let i = 0; i < (l ? (unitSize + borderWidth) : unitSize); i++) {
      strokeBorder.call(this, DIR.BOTTOM, start + (4 * (unitSize) * size) + 4 * (unitSize - i), borderColor, size, borderWidth);
    }
  }
  if (l) {
    for (let i = 0; i < (t ? (unitSize + borderWidth) : unitSize); i++) {
      strokeBorder.call(this, DIR.LEFT, start + (4 * (unitSize - i) * size), borderColor, size, borderWidth);
    }
  }
}

function strokeBorder(this: Uint8ClampedArray, type: DIR, index: number, borderColor: number[], size: number, borderWidth: number) {
  for (let i = 0; i < borderWidth; i++) {
    switch (type) {
      case DIR.TOP:
        fill1px.call(this, index - 4 * size * i, borderColor);
        break;
      case DIR.RIGHT:
        fill1px.call(this, index + 4 * i, borderColor);
        break;
      case DIR.BOTTOM:
        fill1px.call(this, index + 4 * size * i, borderColor);
        break;
      case DIR.LEFT:
        fill1px.call(this, index - 4 * i, borderColor);
        break;
    }
  }
}

function fill1px(this: Uint8ClampedArray, index: number, borderColor: number[]) {
  for (let i = 0; i < borderColor.length; i++) {
    this[index + i] = borderColor[i];
  }
}

interface AttrItemProps {
  label: string,
}

const AttrItem: React.SFC<AttrItemProps> = ({label, children}) => {
  return (
    <Row gutter={[0, 20]}>
      <Col span={6}>{label}:</Col>
      <Col span={18}>{children}</Col>
    </Row>
  )
}

interface CanvasContainerProps {
  canvasSize: number,
  imgUrl: string,
}

const MAP_SIZE = 200;

const CanvasContainer =  React.forwardRef<HTMLCanvasElement, CanvasContainerProps>(({canvasSize, imgUrl}, ref) => {
  const canvasWrapper = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => ({width: 0, height: 0}));
  const [position, setPosition] = useState(() => ({left: 0, top: 0}));
  useEffect(() => {
    const canvasWrapperEl = canvasWrapper.current;
    const changeSize = () => {
      if (!canvasWrapperEl) return;
      setSize({
        width: canvasWrapperEl.offsetWidth || 0,
        height: canvasWrapperEl.offsetHeight || 0,
      });
    }

    const changePosition = () => {
      if (!canvasWrapperEl) return;
      setPosition({
        left: canvasWrapperEl.scrollLeft || 0,
        top: canvasWrapperEl.scrollTop || 0,
      });
    }

    changeSize();
    document.addEventListener('resize', changeSize);
    canvasWrapperEl && canvasWrapperEl.addEventListener('scroll', changePosition);
    return () => {
      document.removeEventListener('resize', changeSize);
      canvasWrapperEl && canvasWrapperEl.removeEventListener('scroll', changePosition);
    }
  }, []);

  const handlerAttr = useMemo(() => {
    const _size = MAP_SIZE * size.width / canvasSize;
    const scale = MAP_SIZE / canvasSize;
    return {
      width: _size,
      height: _size,
      left: position.left * scale,
      top: position.top * scale,
    };
  }, [size, position, canvasSize]);
  return (
    <div className="grid-stroke__canvas-contianer">
      <div ref={canvasWrapper} className="grid-stroke__canvas">
        <canvas ref={ref} width={canvasSize} height={canvasSize}></canvas>
      </div>
      <div className="grid-stroke__map-container">
        <p>Map：</p>
        <div className="grid-stroke__map" style={{width: MAP_SIZE, height: MAP_SIZE}}>
          <img src={imgUrl} alt=""></img>
          <div className="grid-stroke__map-handler" style={handlerAttr}></div>
        </div>
      </div>
    </div>
  )
})
// const CanvasContainerWithRef = React.forwardRef<HTMLCanvasElement>(CanvasContainer);

const GridStroke: React.SFC = () => {
  const [modalVis, setModalVis] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [canvasSize, setCanvasSize] = useState(2016);
  const [imgBase64Url, setImgBase64Url] = useState();
  const [unitSize, setUnitSize] = useState(16);
  const [gridColor, setGridColor] = useState({r: 0, g: 0, b: 0, a: 1});
  const [borderWidth, setborderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState({r: 0, g: 0, b: 0, a: 1});
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const beforeUpload = useCallback((file) => {
    getBase64(file).then(setImgBase64Url);
    return false;
  }, []);
  useEffect(() => {
    if (imgBase64Url) {
      loadImage(imgBase64Url).then((img) => {
        console.log(img)
        if (canvasEl.current !== null) {
          const { width: cw, height: ch } = canvasEl.current;
          const ctx = canvasEl.current.getContext('2d');
          if (ctx === null) return;
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0);
          // 画网格
          const colorArr = rgb2arr(gridColor);
          const strokeColor = `rgba(${colorArr.join(', ')})`;
          console.log(strokeColor);
          ctx.strokeStyle = strokeColor;
          for (let i = unitSize; i < cw; i += unitSize) {
            ctx.beginPath();
            ctx.moveTo(0, i + 0.5);
            ctx.lineTo(cw, i + 0.5);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(i + 0.5, 0);
            ctx.lineTo(i + 0.5, ch);
            ctx.closePath();
            ctx.stroke();
          }
    
          const imageData = ctx.getImageData(0, 0, cw, ch);
          const data = imageData.data;

          // 去掉非边网格线
          const extraGrid = cw % unitSize * 4 || unitSize * 4;
          const lastGrid = 4 * cw - extraGrid;
          let i = unitSize * 4;
          while(i < data.length) {
            if (i < 4 * cw || parseInt(i / (4 * cw) + '') % unitSize > 0) {
              if (data[i - 4 + 3] === 0 && data[i + 4 + 3] === 0) { // 左右两边是空白则去掉
                // for (let j = 0; j < 4; j++) {
                //   data[i + j] = colorArr[j];
                // }
                data[i + 3] = 0;
              }
              if (i % (4 * cw) === lastGrid) {
                i += extraGrid;
              } else {
                i += 4 * unitSize;
              }
            } else {
              if (
                (i % unitSize === 0 && data[i - 4 * cw + 3] === 0 && data[i - 4 + 3] === 0 && data[i + 4 * (cw + 1) + 3] === 0) // 上  左  右下
                ||
                (data[i - 4 * cw + 3] === 0 && data[i + 4 * cw + 3] === 0)
              ) {
                // for (let j = 0; j < 4; j++) {
                //   data[i + j] = colorArr[j];
                // }
                data[i + 3] = 0;
              }
              i += 4;
            }
          }

          let j = unitSize * 4;
          while (j < data.length) {
            if (data[j + 4 * (cw * unitSize / 2 + unitSize / 2) + 3] !== 0) { // 有颜色
              const t = data[j - 4 * (cw - unitSize / 2) + 3];
              const r = data[j + 4 * (unitSize / 2 * cw + unitSize + 1) + 3];
              const b = data[j + 4 * ((unitSize + 1) * cw + unitSize / 2) + 3];
              const l = data[j + 4 * (unitSize / 2 * cw - 1) + 3];
              // toUpdateMap.set(i, [t, r, b, l].map(item => item === 0 || item === undefined));
              const surround = [t, r, b, l].map(item => item === 0 || item === undefined);
              stroke.call(data, j, surround, borderColor, unitSize, cw, borderWidth);
              // break;
            }
            if (j % (4 * cw) === lastGrid) {
              j += extraGrid + 4 * (unitSize - 1) * cw;
            } else {
              j += 4 * unitSize;
            }
          }

          ctx.putImageData(imageData, 0, 0);

          setImgUrl(canvasEl.current.toDataURL('image/png'));
        }
      });
    }
  }, [imgBase64Url, unitSize, canvasSize, gridColor, borderWidth, borderColor]);

  const selectUnitSize = useCallback((v) => {
    setUnitSize(v);
  }, []);

  const selectColor = useCallback((v) => {
    setGridColor(v.rgb);
  }, []);

  const selectBorderColor = useCallback((v) => {
    setBorderColor(v.rgb);
  }, []);

  const selectCanvasSize = useCallback((v) => {
    setCanvasSize(v);
  }, []);

  const exportImg = useCallback(() => {
    if (canvasEl.current === null) return;
    const aEl = document.createElement('a');
    aEl.href = canvasEl.current.toDataURL('image/png');
    aEl.download = 'test.png';
    aEl.click();
    // const href = canvasEl.current.toDataURL('image/png');
    // document.location.href = href.replace('image/png', 'image/octet-stream');
    // Canvas2Image.saveAsPNG(canvasEl.current, canvasEl.current.width, canvasEl.current.height);
  }, []);

  const showImg = useCallback(() => {
    if (canvasEl.current === null) return;
    setImgUrl(canvasEl.current.toDataURL('image/png'));
    setModalVis(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVis(false);
  }, []);
  return (
    <div className="grid-stroke__container">
      {/* <div className="grid-stroke__canvas">
        <canvas ref={canvasEl} width={canvasSize} height={canvasSize}></canvas>
        <div >
          <img src={imgUrl} alt=""></img>
        </div>
      </div> */}
      <CanvasContainer ref={canvasEl} canvasSize={canvasSize} imgUrl={imgUrl}></CanvasContainer>
      <div className="grid-stroke__attr">
        <AttrItem label="图片">
          <Upload
            listType="picture-card"
            showUploadList={false}
            beforeUpload={beforeUpload}
          >
            {
              imgBase64Url
                ? <img src={imgBase64Url} style={{width: '100%'}} alt="pic"></img>
                : (
                  <div>
                    <div className="ant-upload-text">Upload</div>
                  </div>
                )
            }
          </Upload>
        </AttrItem>
        <AttrItem label="图片大小">
          <Select defaultValue={2016} style={{width: 80}} onChange={selectCanvasSize}>
            <Select.Option value={504}>504</Select.Option>
            <Select.Option value={1008}>1008</Select.Option>
            <Select.Option value={2016}>2016</Select.Option>
          </Select>
        </AttrItem>
        <AttrItem label="网格颜色">
          <ChromePicker color={gridColor} onChange={selectColor}></ChromePicker>
        </AttrItem>
        <AttrItem label="网格大小">
          <Select defaultValue={16} style={{width: 60}} onChange={selectUnitSize}>
            <Select.Option value={4}>4</Select.Option>
            <Select.Option value={8}>8</Select.Option>
            <Select.Option value={16}>16</Select.Option>
          </Select>
        </AttrItem>
        <AttrItem label="描边颜色">
          <ChromePicker color={borderColor} onChange={selectBorderColor}></ChromePicker>
        </AttrItem>
        <AttrItem label="描边宽度">
          <Select defaultValue={1} style={{width: 60}} onChange={setborderWidth}>
            <Select.Option value={1}>1</Select.Option>
            <Select.Option value={2}>2</Select.Option>
            <Select.Option value={4}>4</Select.Option>
            <Select.Option value={6}>6</Select.Option>
          </Select>
        </AttrItem>
        <Button onClick={exportImg}>导出</Button>
        <Button onClick={showImg}>弹出图片手动保存</Button>

        <Modal
          title="长按或右击保存"
          visible={modalVis}
          onOk={closeModal}
          onCancel={closeModal}
        >
          <div style={{width: '400px', height: '400px', overflow: 'scroll', margin: '0 auto'}}>
            <img src={imgUrl} alt=""/>
          </div>
        </Modal>
      </div>
    </div>
  )
};

export default GridStroke;