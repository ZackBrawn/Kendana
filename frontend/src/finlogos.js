import { h } from 'vue';

const createCdnLogoComponent = (slug) => {
  return {
    name: `FinLogo-${slug}`,
    props: {
      size: { type: [Number, String], default: 24 }
    },
    render() {
      return h('img', {
        src: `https://raw.githubusercontent.com/hafidznoor/idn-finlogos/master/icons/${slug}.svg`,
        width: this.size,
        height: this.size,
        alt: slug,
        style: { display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain' }
      });
    }
  };
};

export const Phgopay = createCdnLogoComponent('gopay');
export const Phovo = createCdnLogoComponent('ovo');
export const Phdana = createCdnLogoComponent('dana');
export const Phlinkaja = createCdnLogoComponent('linkaja');
export const Phshopeepay = createCdnLogoComponent('shopee-pay');
export const Phbca = createCdnLogoComponent('bca');
export const Phmandiri = createCdnLogoComponent('mandiri');
export const Phbni = createCdnLogoComponent('bni');
export const Phbri = createCdnLogoComponent('bri');
export const Phjago = createCdnLogoComponent('jago');
export const Phseabank = createCdnLogoComponent('seabank');
export const Phjenius = createCdnLogoComponent('jenius');

